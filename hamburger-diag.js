const { chromium, devices } = require("playwright");

const BASE = "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  // 1. What sits on top of the hamburger?
  const hit = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Open menu"]');
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      found: true,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      visible: !!(r.width && r.height),
      topElement: top ? top.tagName + "." + (top.className || "").toString().slice(0, 60) : null,
      isTheButton: top === btn || btn.contains(top),
      btnDisabled: btn.disabled,
      pointerEvents: getComputedStyle(btn).pointerEvents,
      zIndexHeader: getComputedStyle(document.querySelector("header")).zIndex,
    };
  });
  console.log("HIT TEST:", JSON.stringify(hit, null, 2));

  // 2. Single tap -> does menu open?
  await page.locator('button[aria-label="Open menu"]').first().tap();
  await page.waitForTimeout(400);
  let state = await page.evaluate(() => ({
    overlay: !!document.querySelector("header .fixed.inset-0"),
    closeBtn: !!document.querySelector('button[aria-label="Close menu"]'),
    bodyOverflow: document.body.style.overflow,
  }));
  console.log("AFTER 1 TAP:", JSON.stringify(state));

  // 3. Rapid double tap (the impatient user)
  if (state.overlay) {
    await page.evaluate(() => document.querySelector('header .fixed.inset-0 button[aria-label="Close menu"]')?.click());
    await page.waitForTimeout(300);
  }
  await page.locator('button[aria-label="Open menu"]').first().tap().catch(() => {});
  await page.waitForTimeout(120);
  await page.locator('button[aria-label="Close menu"]').first().tap({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(400);
  state = await page.evaluate(() => ({
    overlay: !!document.querySelector("header .fixed.inset-0"),
  }));
  console.log("AFTER IMPATIENT 2ND TAP (menu should still be open):", JSON.stringify(state));

  console.log("JS ERRORS:", errors.length ? errors.slice(0, 5) : "none");
  await browser.close();
})();
