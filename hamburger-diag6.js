const { chromium, devices } = require("playwright");
const BASE = "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 600)));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("WebSocket")) console.log("CONSOLE ERROR:", m.text().slice(0, 600));
  });

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);

  const probe = await page.evaluate(() => {
    return {
      next_f: Array.isArray(self.__next_f) ? self.__next_f.length : typeof self.__next_f,
      next_f_first: Array.isArray(self.__next_f) && self.__next_f[0] ? String(self.__next_f[0]).slice(0, 80) : null,
      next: typeof window.next,
      RC: typeof window.$RC,
      RB: typeof window.$RB,
      cspMeta: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content?.slice(0, 120) || null,
      moduleScripts: [...document.querySelectorAll('script[type="module"]')].length,
      plainScripts: [...document.querySelectorAll("script[src]")].map((s) => s.src.split("/").pop()).filter((x) => x.includes("client") || x.includes("entry") || x.includes("app")).slice(0, 8),
      turbopackGlobal: typeof window.TURBOPACK,
      webpack: typeof window.webpackChunkNext,
      reactDomClient: typeof window.ReactDOM,
    };
  });
  console.log("PROBE:", JSON.stringify(probe, null, 2));

  // Did the Next client entry run? It normally sets window.next after bootstrap
  await page.waitForTimeout(3000);
  const later = await page.evaluate(() => ({
    next: typeof window.next,
    version: window.next?.version,
    router: !!window.next?.router,
    hydration: window.next?.hydration,
  }));
  console.log("AFTER WAIT:", JSON.stringify(later));

  await browser.close();
})();
