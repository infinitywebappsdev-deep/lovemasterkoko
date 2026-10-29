// Desktop Menu pill test
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 250)); });

  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(4000);

  const pill = await page.$('header button[aria-label="Open menu"]:visible');
  console.log("visible Menu pill:", !!pill);
  if (pill) {
    const box = await pill.boundingBox();
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      const b = el && el.closest("button");
      return el ? `${el.tagName} inBtn=${!!b} label=${b ? b.getAttribute("aria-label") : "-"} cls="${String(el.className).slice(0, 60)}"` : "nothing";
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    console.log("hit-test:", hit);

    await pill.click({ timeout: 5000 }).catch((e) => console.log("click err:", e.message.split("\n")[0]));
    await page.waitForTimeout(900);

    const state = await page.evaluate(() => {
      const overlay = document.querySelector("header > .fixed.inset-0");
      const r = overlay ? overlay.getBoundingClientRect() : null;
      return {
        overlayOpen: !!overlay,
        rect: r ? { w: r.width, h: r.height, y: r.y } : null,
        bodyLocked: document.body.style.overflow === "hidden",
        hasNavText: overlay ? overlay.innerText.toUpperCase().includes("NAVIGATION MENU") : false,
        centerEl: (() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return e ? `${e.tagName}.${String(e.className).slice(0, 60)}` : "none"; })(),
      };
    });
    console.log("after pill click:", JSON.stringify(state));

    // click a nav link inside overlay
    const rooms = await page.$('header a[href="/rooms"]:visible');
    if (rooms) {
      await rooms.click();
      await page.waitForTimeout(2500);
      console.log("after nav click, url:", page.url());
    }

    await page.screenshot({ path: "artifacts/menu-desktop.png", clip: { x: 0, y: 0, width: 1440, height: 900 } });
  }
  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n")[0]); process.exit(1); });
