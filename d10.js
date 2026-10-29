const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  // capture unhandled rejections BEFORE any page script runs
  await p.addInitScript(() => {
    window.__rejections = [];
    window.addEventListener("unhandledrejection", (e) => {
      const r = e.reason;
      window.__rejections.push({
        msg: r ? (r.message || String(r)) : "unknown",
        stack: r && r.stack ? String(r.stack).slice(0, 600) : "",
      });
    });
    window.addEventListener("error", (e) => {
      window.__rejections.push({ msg: "ERROR: " + (e.message || ""), stack: (e.filename || "") + ":" + (e.lineno || "") });
    });
  });
  p.on("pageerror", e => console.log("PAGEERROR:", e.message.slice(0, 300)));
  await p.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(8000);
  const r = await p.evaluate(() => ({
    rejections: window.__rejections,
    next_f: Array.isArray(self.__next_f) ? self.__next_f.length : typeof self.__next_f,
    next_f_sample: Array.isArray(self.__next_f) ? self.__next_f.slice(0, 3).map(x => String(x).slice(0, 60)) : null,
    router: !!window.next?.router,
    devtools: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
  }));
  console.log(JSON.stringify(r, null, 1).slice(0, 4000));
  await b.close();
})();
