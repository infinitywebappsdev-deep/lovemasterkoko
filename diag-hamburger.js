// Hamburger menu diagnostics: click, hit-test, overlay state
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();

  for (const vp of [{ w: 390, h: 844, name: "mobile" }, { w: 1440, h: 960, name: "desktop" }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.name === "mobile", isMobile: vp.name === "mobile" });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e).slice(0, 250)));

    await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(4000);

    console.log(`\n== ${vp.name} ${vp.w}x${vp.h}`);

    // Find the header hamburger (aria-label "Open menu")
    const btn = await page.$('header button[aria-label="Open menu"]');
    console.log("hamburger button found:", !!btn);
    if (btn) {
      const box = await btn.boundingBox();
      const visible = await btn.isVisible();
      const enabled = !(await btn.isDisabled());
      console.log(`visible=${visible} enabled=${enabled} box=${JSON.stringify(box)}`);

      // Hit-test: what element actually receives the click at the button center?
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return "nothing";
        const btn = el.closest("button");
        return `${el.tagName} cls="${String(el.className).slice(0, 90)}" insideButton=${!!btn} btnLabel=${btn ? btn.getAttribute("aria-label") : "-"}`;
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      console.log("hit-test at center:", hit);

      // Click and observe state
      await btn.click({ timeout: 5000 }).catch((e) => console.log("click error:", e.message.split("\n")[0]));
      await page.waitForTimeout(900);

      const overlay = await page.evaluate(() => {
        const navs = Array.from(document.querySelectorAll("header > div"));
        const fixed = Array.from(document.querySelectorAll(".fixed.inset-0"));
        return { fixedOverlays: fixed.length, bodyOverflow: document.body.style.overflow };
      });
      console.log("after click -> overlays:", JSON.stringify(overlay));

      const menuText = await page.evaluate(() => /Navigation Menu/.test(document.body.innerText));
      console.log("menu overlay text visible:", menuText);

      // Can we click a menu item?
      if (menuText) {
        const item = await page.$('a[href="/rooms"]');
        console.log("rooms link in overlay:", !!item);
        // close again
        const closeBtn = await page.$('header button[aria-label="Close menu"]');
        if (closeBtn) { await closeBtn.click().catch(() => {}); await page.waitForTimeout(600); }
        const after = await page.evaluate(() => /Navigation Menu/.test(document.body.innerText));
        console.log("after close, overlay gone:", !after);
      }
    } else {
      // desktop: Menu pill button
      const pill = await page.$('header button:has-text("Menu")');
      console.log("desktop Menu pill found:", !!pill);
      if (pill) {
        await pill.click({ timeout: 5000 }).catch((e) => console.log("click error:", e.message.split("\n")[0]));
        await page.waitForTimeout(900);
        const menuText = await page.evaluate(() => /Navigation Menu/.test(document.body.innerText));
        console.log("after pill click, overlay visible:", menuText);
      }
    }
    console.log("pageerrors:", errs.length ? errs : "none");
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n")[0]); process.exit(1); });
