const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

  for (const path of ["/rooms/super-executive", "/rooms/luxury"]) {
    await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(5000);
    await p.evaluate(() => window.scrollTo(0, 420));
    await p.waitForTimeout(2500);
    const info = await p.evaluate(() => {
      const i = [...document.querySelectorAll("img")].find((x) => /Executi|Presidential2/i.test(decodeURIComponent(x.currentSrc || x.src)));
      if (!i) return "main image not found";
      const r = i.getBoundingClientRect();
      return {
        file: decodeURIComponent(i.currentSrc || i.src).split("/images/")[1],
        natural: i.naturalWidth + "x" + i.naturalHeight,
        box: Math.round(r.width) + "x" + Math.round(r.height),
        fit: getComputedStyle(i).objectFit,
        broken: i.naturalWidth === 0,
      };
    });
    console.log(path, JSON.stringify(info));
    await p.screenshot({ path: "artifacts/desktop-" + path.split("/").pop() + ".png" });
  }
  await b.close();
})();
