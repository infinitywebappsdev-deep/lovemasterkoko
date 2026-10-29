// Inspect the open menu overlay geometry
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));

  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(4000);

  await page.click('header button[aria-label="Open menu"]');
  await page.waitForTimeout(900);

  const info = await page.evaluate(() => {
    const overlay = document.querySelector("header > .fixed.inset-0") || document.querySelector(".fixed.inset-0");
    if (!overlay) return { found: false };
    const cs = getComputedStyle(overlay);
    const r = overlay.getBoundingClientRect();
    const hasText = overlay.innerText.includes("Navigation Menu");
    // nearest ancestor with transform/filter/backdrop-filter/perspective/contain
    let scroller = null, el = overlay.parentElement;
    while (el && el !== document.documentElement) {
      const c = getComputedStyle(el);
      if (c.transform !== "none" || c.filter !== "none" || c.backdropFilter !== "none" || c.perspective !== "none" || c.contain !== "none" || c.willChange !== "auto") {
        scroller = `${el.tagName}.${String(el.className).slice(0, 80)} transform=${c.transform} filter=${c.filter} backdrop=${c.backdropFilter} contain=${c.contain} willChange=${c.willChange}`;
        break;
      }
      el = el.parentElement;
    }
    return {
      found: true,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      position: cs.position,
      z: cs.zIndex,
      display: cs.display,
      overflow: cs.overflow,
      opacity: cs.opacity,
      pointerEvents: cs.pointerEvents,
      hasText,
      textLen: overlay.innerText.length,
      scroller,
      // what's at the middle of the screen right now?
      atCenter: (() => {
        const e2 = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        return e2 ? `${e2.tagName}.${String(e2.className).slice(0, 70)}` : "nothing";
      })(),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: "artifacts/menu-open.png" });
  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n")[0]); process.exit(1); });
