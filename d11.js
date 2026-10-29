const { chromium, devices } = require("playwright");
const PORT = process.argv[2] || "3001";
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  p.on("pageerror", e => console.log("PAGEERROR:", e.message.slice(0, 300)));
  await p.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(6000);
  const hyd = await p.evaluate(() => {
    let owned = 0;
    document.querySelectorAll("body *").forEach(el => { if (Object.keys(el).some(k => k.startsWith("__reactFiber"))) owned++; });
    return { owned, docOwned: Object.keys(document).some(k => k.startsWith("__reactContainer")) };
  });
  console.log("PORT " + PORT + " hydration:", JSON.stringify(hyd));
  // tap hamburger
  const btn = p.locator('button[aria-label="Open menu"]').first();
  if (await btn.count()) {
    await btn.tap().catch(e => console.log("tap failed:", e.message.slice(0,100)));
    await p.waitForTimeout(600);
    const after = await p.evaluate(() => ({
      overlay: !!document.querySelector("header div.fixed.inset-0"),
      label: document.querySelector("header button")?.getAttribute("aria-label"),
      overflow: document.body.style.overflow,
    }));
    console.log("  after tap:", JSON.stringify(after));
  } else console.log("  hamburger button not found");
  await b.close();
})();
