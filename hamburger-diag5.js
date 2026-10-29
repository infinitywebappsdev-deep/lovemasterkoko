const { chromium, devices } = require("playwright");
const BASE = "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" && !t.includes("WebSocket")) console.log("CONSOLE ERROR:", t.slice(0, 800));
  });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 800)));

  await page.goto(BASE + "/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(6000);

  const list = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("*").forEach((el) => {
      const k = Object.keys(el).filter((x) => x.startsWith("__react"));
      if (k.length) {
        out.push({
          tag: el.tagName,
          cls: String(el.className || "").slice(0, 50),
          parent: el.parentElement ? el.parentElement.tagName + "." + String(el.parentElement.className).slice(0, 30) : "",
          keys: k.map((x) => x.split("$")[0]).join(","),
        });
      }
    });
    return out;
  });
  console.log("NODES WITH REACT KEYS (" + list.length + "):");
  list.forEach((n) => console.log("  " + n.tag + " cls=" + n.cls + " | parent=" + n.parent + " | " + n.keys));

  await browser.close();
})();
