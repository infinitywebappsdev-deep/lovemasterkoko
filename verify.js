// Verify: calendar, toggle (incl. blocked storage), flow, screenshots
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const results = [];

  // ===== A: normal desktop pass =====
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 250)));
  page.on("console", (m) => { if (m.type() === "error") errs.push("[console] " + m.text().slice(0, 250)); });

  await page.goto("http://localhost:3000/booking", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(5000);

  // Toggle works
  const d0 = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await page.click('button[aria-label*="mode"]');
  await page.waitForTimeout(500);
  const d1 = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  results.push(`toggle: ${d0}->${d1} ${d0 !== d1 ? "OK" : "FAIL"}`);

  // Calendar: pick check-in + check-out
  const days = await page.$$('button[aria-label*=": Available"]');
  let inBtn = null, inLabel = "";
  for (const b of days) {
    const l = await b.getAttribute("aria-label");
    if (!(await b.isDisabled())) { inBtn = b; inLabel = l; break; }
  }
  if (inBtn) {
    await inBtn.click();
    await page.waitForTimeout(600);
    const p = inLabel.split(":")[0].split("-");
    const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + 4));
    const out = d.toISOString().slice(0, 10);
    const outBtn = await page.$(`button[aria-label="${out}: Available"]`);
    if (outBtn && !(await outBtn.isDisabled())) { await outBtn.click(); await page.waitForTimeout(600); }
    const selIn = await page.$$('button[aria-label*="Selected Check-in"]');
    const selOut = await page.$$('button[aria-label*="Selected Check-out"]');
    results.push(`calendar: in=${selIn.length} out=${selOut.length} ${selIn.length && selOut.length ? "OK" : "FAIL"}`);

    // stay summary cards rendered?
    const hasCards = await page.evaluate(() => /Check-in/.test(document.body.innerText) && /Check-out/.test(document.body.innerText) && /nt/.test(document.body.innerText));
    results.push(`stay summary cards: ${hasCards ? "OK" : "FAIL"}`);

    await page.screenshot({ path: "artifacts/booking-calendar.png", clip: { x: 0, y: 380, width: 1440, height: 900 } });

    // search flow
    const sb = await page.$('button:has-text("Find Available Suites")');
    if (sb && !(await sb.isDisabled())) {
      await sb.click();
      await page.waitForTimeout(5000);
      const t = await page.evaluate(() => document.body.innerText);
      results.push(`search->step2: ${/Available Suites/.test(t) ? "OK" : "FAIL"}`);
      await page.screenshot({ path: "artifacts/booking-step2.png", clip: { x: 0, y: 300, width: 1440, height: 900 } });
    }
  } else {
    results.push("calendar: FAIL (no clickable days)");
  }

  await page.screenshot({ path: "artifacts/booking-hero.png", clip: { x: 0, y: 0, width: 1440, height: 700 } });
  results.push(`page errors: ${errs.length ? errs.slice(0, 3).join(" | ") : "none"}`);
  await page.close();

  // ===== B: blocked sessionStorage — toggle must still stick =====
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p2.addInitScript(() => {
    const boom = () => { throw new Error("storage blocked"); };
    Object.defineProperty(window, "sessionStorage", { get: boom });
  });
  await p2.goto("http://localhost:3000/booking", { waitUntil: "load", timeout: 90000 });
  await p2.waitForTimeout(3500);
  const b0 = await p2.evaluate(() => document.documentElement.classList.contains("dark"));
  await p2.click('button[aria-label*="mode"]');
  await p2.waitForTimeout(500);
  const b1 = await p2.evaluate(() => document.documentElement.classList.contains("dark"));
  await p2.waitForTimeout(22000); // outlast the 20s schedule sync
  const b2 = await p2.evaluate(() => document.documentElement.classList.contains("dark"));
  results.push(`blocked-storage toggle: ${b0}->${b1}, after 22s=${b2} ${b0 !== b1 && b1 === b2 ? "OK (sticks)" : "FAIL"}`);
  await p2.close();

  // ===== C: mobile screenshot =====
  const p3 = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p3.goto("http://localhost:3000/booking", { waitUntil: "load", timeout: 90000 });
  await p3.waitForTimeout(4500);
  await p3.screenshot({ path: "artifacts/booking-mobile.png" });
  await p3.close();

  console.log(results.join("\n"));
  await browser.close();
})().catch((e) => { console.error("VERIFY FAILED:", e.message.split("\n")[0]); process.exit(1); });
