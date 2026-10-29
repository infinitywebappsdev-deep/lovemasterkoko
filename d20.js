const { chromium, devices } = require("playwright");

const imgReport = () =>
  [...document.querySelectorAll("img")]
    .filter((i) => i.offsetHeight > 0)
    .map((i) => ({
      src: decodeURIComponent(i.currentSrc || i.src).split("/").pop().slice(0, 45),
      nat: i.naturalWidth + "x" + i.naturalHeight,
      box: Math.round(i.getBoundingClientRect().width) + "x" + Math.round(i.getBoundingClientRect().height),
      complete: i.complete,
      broken: i.naturalWidth === 0,
      fit: getComputedStyle(i).objectFit,
    }))
    .filter((x) => /presidential|super|luxury|executi|DELUXE|Standard|Suite/i.test(x.src));

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const errs = [];
  p.on("response", (r) => {
    if (r.status() >= 400 && /images|_next\/image/.test(r.url())) errs.push(r.status() + " " + decodeURIComponent(r.url()).slice(-70));
  });

  for (const path of ["/rooms", "/rooms/luxury", "/rooms/super-executive"]) {
    await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(4500);
    await p.evaluate(() => window.scrollTo(0, 600));
    await p.waitForTimeout(2500);
    const imgs = await p.evaluate(imgReport);
    console.log("\n== " + path + " ==");
    console.log(JSON.stringify(imgs, null, 1).slice(0, 1600));
    await p.screenshot({ path: "artifacts/rooms-" + (path.split("/").pop() || "root") + ".png" });
  }
  console.log("\nFAILED REQUESTS:", errs.length ? errs.slice(0, 8) : "none");
  await b.close();
})();
