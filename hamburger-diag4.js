const { chromium, devices } = require("playwright");
const BASE = "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const t = m.text();
    if (!t.includes("WebSocket")) console.log("CONSOLE[" + m.type() + "]:", t.slice(0, 400));
  });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 500)));

  await page.goto(BASE + "/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(6000);

  const probe = await page.evaluate(() => {
    const info = (el, name) => {
      if (!el) return name + ": MISSING";
      const keys = Object.keys(el);
      const r = keys.filter((k) => k.startsWith("__react"));
      return name + ": keys=" + (r.length ? r.join(",") : "[]") + " tag=" + el.tagName;
    };
    const out = [];
    out.push(info(document.body.querySelector(":scope > div"), "body>div"));
    out.push(info(document.querySelector("header"), "header"));
    out.push(info(document.querySelector("header button"), "header button"));
    out.push(info(document.querySelector("a[href='/rooms']"), "nav link"));
    out.push(info(document.querySelector("main"), "main"));
    // any node in the whole document with a react key at all?
    let anyReact = 0;
    document.querySelectorAll("*").forEach((el) => {
      if (Object.keys(el).some((k) => k.startsWith("__react"))) anyReact++;
    });
    out.push("nodesWithReactKeys=" + anyReact + " totalNodes=" + document.querySelectorAll("*").length);
    return out;
  });
  console.log("REACT PROBE:\n  " + probe.join("\n  "));

  // theme toggle: does app state change DOM?
  const before = await page.evaluate(() => document.documentElement.className + "|" + document.body.className);
  await page.locator('button[aria-label*="Switch to"]').first().click();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => document.documentElement.className + "|" + document.body.className);
  console.log("THEME TOGGLE: before=" + before + " -> after=" + after + " changed=" + (before !== after));

  await browser.close();
})();
