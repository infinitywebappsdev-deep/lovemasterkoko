const { chromium, devices } = require("playwright");
const PAGES = ["/", "/rooms", "/about", "/admin/login", "/booking"];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices["iPhone 13"] });
  for (const path of PAGES) {
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", e => errs.push(e.message.slice(0, 150)));
    p.on("console", m => { if (m.type() === "error" && !m.text().includes("WebSocket")) errs.push("C:" + m.text().slice(0, 150)); });
    try {
      await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(5000);
      const r = await p.evaluate(() => {
        let owned = 0;
        document.querySelectorAll("body *").forEach(el => { if (Object.keys(el).some(k => k.startsWith("__reactFiber") || k.startsWith("__reactContainer"))) owned++; });
        const btn = document.querySelector("button");
        return { owned, hasButton: !!btn, f: Array.isArray(self.__next_f) ? self.__next_f.length : -1 };
      });
      console.log(path.padEnd(16), "reactOwnedNodes=" + String(r.owned).padEnd(4), "next_f=" + r.f, errs.length ? " ERR:" + errs[0] : " no-errors");
    } catch (e) { console.log(path, "GOTO FAIL", e.message.slice(0, 100)); }
    await p.close();
  }
  await b.close();
})();
