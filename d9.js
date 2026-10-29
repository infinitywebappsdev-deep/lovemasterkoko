const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  p.on("pageerror", e => console.log("PAGEERROR:", e.message.slice(0, 400)));
  await p.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(7000);
  const r = await p.evaluate(() => {
    const docKeys = Object.keys(document).filter(k => k.startsWith("__react"));
    const winKeys = Object.keys(window).filter(k => k.toLowerCase().includes("react") || k.includes("__next"));
    // walk up from a header button to find its fiber owner
    const btn = document.querySelector("button");
    let chain = [];
    let el = btn;
    while (el) { const k = Object.keys(el).filter(x => x.startsWith("__react")); if (k.length) chain.push(el.tagName + ":" + k.join(",")); el = el.parentElement || (el === document.body ? document : null); if (el === document) { const dk = Object.keys(document).filter(x => x.startsWith("__react")); if (dk.length) chain.push("document:" + dk.join(",")); break; } }
    // Does document have a fiber/container?
    const dk = Object.keys(document).filter(x => x.startsWith("__react"));
    // find ANY node anywhere (incl head) with __reactFiber
    let fiberNodes = [];
    document.querySelectorAll("*").forEach(el => { if (Object.keys(el).some(x => x.startsWith("__reactFiber"))) fiberNodes.push(el.tagName); });
    return { docKeys, winKeys: winKeys.slice(0,10), chain, documentReact: dk, fiberNodeCount: fiberNodes.length, fiberSample: fiberNodes.slice(0,5) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
