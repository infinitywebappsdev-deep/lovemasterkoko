const { chromium, devices } = require("playwright");
const BASE = "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();

  const bad = [];
  const scripts = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/_next/")) {
      if (r.status() >= 400) bad.push(r.status() + " " + u.replace(BASE, ""));
      if (u.endsWith(".js") || u.includes(".js?")) scripts.push(r.status() + " " + u.replace(BASE, "").slice(0, 90));
    }
  });
  page.on("requestfailed", (r) => bad.push("FAILED " + r.failure()?.errorText + " " + r.url().replace(BASE, "")));
  page.on("console", (m) => {
    if (m.type() !== "warning") console.log("CONSOLE[" + m.type() + "]:", m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 300)));

  await page.goto(BASE + "/", { waitUntil: "load", timeout: 60000 }).catch((e) => console.log("goto:", e.message));
  await page.waitForTimeout(9000);

  console.log("\nSCRIPTS LOADED (" + scripts.length + "):");
  scripts.forEach((s) => console.log("  " + s));
  console.log("\nBAD RESPONSES:", bad.length ? bad.slice(0, 10) : "none");

  const h = await page.evaluate(() => ({
    scripts: document.scripts.length,
    react: Object.keys(document.body).filter((k) => k.startsWith("__react")).length,
    bodyClasses: document.body.className,
  }));
  console.log("\nDOM:", JSON.stringify(h));

  await browser.close();
})();
