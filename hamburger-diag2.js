const { chromium, devices } = require("playwright");
const BASE = "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Is React hydrated on the button?
  const reactInfo = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Open menu"]');
    const keys = Object.keys(btn);
    const reactKey = keys.find((k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$"));
    return {
      reactAttached: !!reactKey,
      keys: keys.slice(0, 5),
      hasOnClick: reactKey && btn[reactKey] ? typeof btn[reactKey].onClick : "n/a",
      readyState: document.readyState,
      nextData: !!document.getElementById("__NEXT_DATA__"),
    };
  });
  console.log("HYDRATION:", JSON.stringify(reactInfo));

  // 1) plain JS click()
  await page.evaluate(() => document.querySelector('button[aria-label="Open menu"]').click());
  await page.waitForTimeout(500);
  let s = await page.evaluate(() => ({
    overlay: !!document.querySelector("header div.fixed.inset-0"),
    overflow: document.body.style.overflow,
    aria: document.querySelector('button[aria-label="Close menu"]') ? "close-btn-present" : "open-btn-still",
  }));
  console.log("AFTER JS click():", JSON.stringify(s));

  // close it if open
  await page.evaluate(() => document.querySelector('button[aria-label="Close menu"]')?.click());
  await page.waitForTimeout(500);

  // 2) Playwright tap again, then watch aria over time
  const btn = page.locator('button[aria-label="Open menu"]').first();
  await btn.tap();
  for (const t of [0, 150, 400, 900]) {
    await page.waitForTimeout(t === 0 ? 30 : t);
    const st = await page.evaluate(() => ({
      overlay: !!document.querySelector("header div.fixed.inset-0"),
      label: document.querySelector("header button")?.getAttribute("aria-label"),
      overflow: document.body.style.overflow,
    }));
    console.log(`  ~${t}ms after tap:`, JSON.stringify(st));
  }

  await browser.close();
})();
