const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const msgs = [];
  p.on("console", m => { if (!m.text().includes("WebSocket")) msgs.push(m.type() + ": " + m.text().slice(0, 200)); });
  p.on("pageerror", e => msgs.push("PAGEERROR: " + e.message.slice(0, 300)));
  await p.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(7000);
  const r = await p.evaluate(() => ({
    bodyKeys: Object.keys(document.body).filter(k => k.startsWith("__react")),
    htmlKeys: Object.keys(document.documentElement).filter(k => k.startsWith("__react")),
    rootChildren: document.body.firstElementChild?.tagName,
    next_f_len: Array.isArray(self.__next_f) ? self.__next_f.length : typeof self.__next_f,
    router: !!window.next?.router,
    // Does React own ANY node in body?
    ownedInBody: (() => { let n = 0; document.body.querySelectorAll("*").forEach(el => { if (Object.keys(el).some(k => k.startsWith("__reactFiber") || k.startsWith("__reactContainer") || k.startsWith("__reactProps"))) n++; }); return n; })(),
  }));
  console.log("RESULT:", JSON.stringify(r, null, 1));
  console.log("CONSOLE:\n" + (msgs.join("\n") || "  (none)"));
  await b.close();
})();
