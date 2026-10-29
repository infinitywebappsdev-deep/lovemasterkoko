const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  await p.goto("http://127.0.0.1:3000/rooms", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(6000);
  const cache = await p.evaluate(() => localStorage.getItem("banky_custom_rooms_cache"));
  if (cache) {
    const rooms = JSON.parse(cache);
    for (const r of rooms) {
      if (/luxury|super/i.test(r.slug) || /luxury|super/i.test(r.name)) {
        console.log("==", r.slug, "|", r.name);
        console.log("   image:", r.image);
        console.log("   images:", JSON.stringify(r.images, null, 1));
      }
    }
  } else console.log("no localStorage cache");
  await b.close();
})();
