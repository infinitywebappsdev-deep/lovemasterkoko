const { chromium, devices } = require("playwright");
const PORT = process.argv[2] || "3000";
const BASE = "http://127.0.0.1:" + PORT;

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("PE:" + e.message.slice(0, 250)));
  p.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404")) errs.push("CE:" + m.text().slice(0, 250));
  });

  await p.goto(BASE + "/booking", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);

  // 1. Find and click the check-in trigger
  const trigger = p.locator('button, [role="button"], div').filter({ hasText: /check.?in/i }).first();
  const trigCount = await p.locator('button').filter({ hasText: /check.?in/i }).count();
  console.log("check-in trigger buttons:", trigCount);

  if (trigCount) {
    const trig = p.locator("button").filter({ hasText: /check.?in/i }).first();
    await trig.click().catch((e) => console.log("trigger click err:", e.message.slice(0, 120)));
    await p.waitForTimeout(1500);
  }

  // 2. Is a calendar visible? (day cells are buttons/td with day numbers)
  const cal = await p.evaluate(() => {
    const heads = [...document.querySelectorAll("h3, h4, .font-display, span")].map((e) => e.innerText).filter((t) => /January|February|March|April|May|June|July|August|September|October|November|December/.test(t)).slice(0, 4);
    const dayBtns = [...document.querySelectorAll("button")].filter((b) => /^\d{1,2}$/.test((b.innerText || "").trim()) && b.offsetHeight > 0);
    return {
      monthLabels: heads,
      dayCellCount: dayBtns.length,
      sampleCells: dayBtns.slice(0, 6).map((b) => ({ t: b.innerText.trim(), disabled: b.disabled, cls: String(b.className).slice(0, 50) })),
    };
  });
  console.log("CALENDAR:", JSON.stringify(cal, null, 1));

  // 3. Click two day cells (check-in then check-out)
  const cells = p.locator("button").filter({ hasText: /^\d{1,2}$/ });
  const n = await cells.count();
  if (n > 2) {
    // pick a cell ~10th in the list (avoid past days at the start of the month)
    const inIdx = Math.min(n - 5, 12);
    const t1 = await cells.nth(inIdx).innerText();
    await cells.nth(inIdx).click().catch((e) => console.log("cell1 err:", e.message.slice(0, 100)));
    await p.waitForTimeout(700);
    const t2 = await cells.nth(inIdx + 3).innerText();
    await cells.nth(inIdx + 3).click().catch((e) => console.log("cell2 err:", e.message.slice(0, 100)));
    await p.waitForTimeout(900);

    const state = await p.evaluate(() => {
      const txt = document.body.innerText;
      return {
        selected: txt.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g)?.slice(0, 6) || [],
        nights: txt.match(/\b\d+\s*nights?\b/i)?.[0] || null,
        warning: txt.match(/sold out[^\n]{0,70}|minimum stay[^\n]{0,60}|cannot span[^\n]{0,70}/i)?.[0] || null,
      };
    });
    console.log(`clicked cells "${t1.trim()}" then "${t2.trim()}" ->`, JSON.stringify(state));
  } else {
    console.log("no day cells found; calendar likely did not open");
  }

  console.log("ERRORS:", errs.length ? errs.slice(0, 4) : "none");
  await p.screenshot({ path: "artifacts/booking-calendar.png", fullPage: false });
  await b.close();
})();
