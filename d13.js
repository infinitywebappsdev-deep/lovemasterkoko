const { chromium, devices } = require("playwright");
const HOST = process.env.PV_HOST;
const PORT = process.argv[2] || "3000";
const BASE = (HOST ? "http://" + HOST : "http://127.0.0.1") + ":" + PORT;
(async () => {
  const b = await chromium.launch({ args: HOST ? [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`] : [] });
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("PE:" + e.message.slice(0, 200)));
  p.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("WebSocket")) errs.push("CE:" + m.text().slice(0, 200));
  });
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(6000);
  const hyd = await p.evaluate(() => {
    let n = 0;
    document.querySelectorAll("body *").forEach((el) => {
      if (Object.keys(el).some((k) => k.startsWith("__reactFiber"))) n++;
    });
    return n;
  });
  let menu = "n/a";
  const btn = p.locator('button[aria-label="Open menu"]').first();
  if (await btn.count()) {
    await btn.tap().catch(() => {});
    await p.waitForTimeout(700);
    menu = (await p.evaluate(() => (document.querySelector("header div.fixed.inset-0") ? "OPEN" : "closed") + "/" + (document.body.style.overflow || "no-scroll-lock")));
  }
  console.log(`${BASE} -> reactNodes=${hyd} menu=${menu}${errs.length ? " ERR:" + errs[0] : ""}`);
  await b.close();
})();
