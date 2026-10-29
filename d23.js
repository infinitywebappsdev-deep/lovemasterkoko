const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  for (const path of ["/rooms/luxury", "/rooms/super-executive", "/rooms"]) {
    await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.scrollTo(0, 500));
    await p.waitForTimeout(2500);
    const imgs = await p.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((i) => i.offsetHeight > 0 && /presidential|super|executi/i.test(decodeURIComponent(i.currentSrc || i.src)))
        .map((i) => ({
          f: decodeURIComponent(i.currentSrc || i.src).split("/images/")[1]?.slice(0, 40),
          nat: i.naturalWidth + "x" + i.naturalHeight,
          broken: i.naturalWidth === 0,
        }))
    );
    console.log(path, JSON.stringify(imgs));
    await p.screenshot({ path: "artifacts/fixed-" + (path.split("/").pop() || "rooms") + ".png" });
  }
  await b.close();
})();
