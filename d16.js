const { chromium, devices } = require("playwright");
const PORT = process.argv[2] || "3000";
const BASE = "http://127.0.0.1:" + PORT;

const readState = () => ({
  dates: document.body.innerText.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{4}\b/g)?.slice(0, 6) || [],
  nights: document.body.innerText.match(/\b\d+\s*nights?\b/i)?.[0] || null,
  warnings: [...document.body.innerText.matchAll(/(sold out[^\n]{0,70}|minimum stay[^\n]{0,60}|cannot span[^\n]{0,60}|please (?:choose|select)[^\n]{0,60})/gi)].slice(0, 3).map((m) => m[0]),
  cta: [...document.querySelectorAll("button,a")].map((b) => (b.innerText || "").trim().replace(/\s+/g, " ")).filter((t) => /continue|check availability|proceed|book|search/i.test(t)).slice(0, 6),
});

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
  console.log("initial:", JSON.stringify(await p.evaluate(readState)));

  // --- A. Quick preset ---
  const tonight = p.getByRole("button", { name: /Tonight/i }).first();
  await tonight.click().catch((e) => console.log("preset click err:", e.message.slice(0, 120)));
  await p.waitForTimeout(1000);
  console.log("after Tonight:", JSON.stringify(await p.evaluate(readState)));

  // --- B. Manual calendar selection ---
  const dayCell = (label) =>
    p.locator('button').filter({ hasText: new RegExp("^\\s*" + label + "\\s*$") }).first();

  // find all day-number buttons via evaluate and click through element handles
  const cells = await p.evaluate(() => {
    const list = [...document.querySelectorAll("button")].filter(
      (b) => b.offsetHeight > 0 && /^\d{1,2}$/.test((b.innerText || "").trim()) && String(b.className).includes("h-14")
    );
    return list.map((b) => b.innerText.trim());
  });
  console.log("day cells visible:", cells.length, cells.slice(0, 8).join(","));

  const clickDay = async (label) => {
    const handle = await p
      .locator('button')
      .filter({ hasText: new RegExp("^\\s*" + label + "\\s*$") })
      .filter({ hasNot: p.locator('[disabled]') })
      .first()
      .elementHandle()
      .catch(() => null);
    if (!handle) return false;
    await handle.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
    return true;
  };

  // pick two future days that are visible
  const future = cells.filter((c) => parseInt(c, 10) >= 28);
  if (future.length >= 2) {
    await clickDay(future[0]);
    await p.waitForTimeout(700);
    console.log("after check-in pick:", JSON.stringify(await p.evaluate(readState)));
    await clickDay(future[future.length - 1]);
    await p.waitForTimeout(900);
    console.log("after check-out pick:", JSON.stringify(await p.evaluate(readState)));
  } else {
    console.log("not enough future day cells; calendar maybe closed");
  }

  // --- C. Try to continue ---
  const cta = p.locator("button").filter({ hasText: /continue|check availability|proceed|search rooms/i }).first();
  if (await cta.count()) {
    await cta.click().catch((e) => console.log("cta err:", e.message.slice(0, 100)));
    await p.waitForTimeout(2500);
    console.log("after CTA url:", p.url());
    console.log("after CTA:", JSON.stringify(await p.evaluate(readState)));
  } else {
    console.log("no continue CTA found");
  }

  console.log("ERRORS:", errs.length ? errs.slice(0, 5) : "none");
  await p.screenshot({ path: "artifacts/booking-flow.png" });
  await b.close();
})();
