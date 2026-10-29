const { chromium, devices } = require("playwright");

const snap = () => ({
  dates: document.body.innerText.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{4}\b/g)?.slice(0, 4) || [],
  rooms: [...document.querySelectorAll("h3,h4,h5,strong")].map((e) => e.innerText.trim()).filter((t) => /suite|room|executive|deluxe|standard|studio|luxury/i.test(t)).slice(0, 8),
  step: document.body.innerText.match(/\b(step|1\s*\/\s*4|of 4)\b/i)?.[0] || null,
  buttons: [...document.querySelectorAll("button")].filter((b) => b.offsetHeight > 0).map((b) => (b.innerText || "").trim().replace(/\s+/g, " ")).filter((t) => t && /select|continue|book|proceed|reserve|pay|confirm/i.test(t)).slice(0, 8),
  warn: [...document.body.innerText.matchAll(/(sold out[^\n]{0,60}|minimum stay[^\n]{0,50}|please select[^\n]{0,60}|required[^\n]{0,50})/gi)].slice(0, 3).map((m) => m[0]),
});

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("PE:" + e.message.slice(0, 250)));
  p.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404")) errs.push("CE:" + m.text().slice(0, 250));
  });
  const clickText = (re) =>
    p.evaluate((rx) => {
      const el = [...document.querySelectorAll("button,a")].find((e) => e.offsetHeight > 0 && new RegExp(rx, "i").test((e.innerText || "").trim()));
      if (!el) return "not-found";
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return "clicked:" + el.innerText.trim().replace(/\s+/g, " ").slice(0, 40);
    }, re.source);

  await p.goto("http://127.0.0.1:3000/booking", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);

  console.log("1 initial:", JSON.stringify(await p.evaluate(snap)));
  console.log("2 Tonight:", await clickText(/Tonight\s*\(1 nt\)/));
  await p.waitForTimeout(800);
  console.log("  state:", JSON.stringify(await p.evaluate(snap)));
  console.log("3 CTA:", await clickText(/FIND AVAILABLE SUITES/i));
  await p.waitForTimeout(3500);
  console.log("  state:", JSON.stringify(await p.evaluate(snap)));
  await p.screenshot({ path: "artifacts/booking-step2.png" });

  console.log("4 Select room:", await clickText(/^select\b|choose\b|book now/i));
  await p.waitForTimeout(2500);
  console.log("  state:", JSON.stringify(await p.evaluate(snap)));
  console.log("  url:", p.url());
  await p.screenshot({ path: "artifacts/booking-step3.png" });

  console.log("5 Continue:", await clickText(/continue|proceed|next\b/i));
  await p.waitForTimeout(2500);
  console.log("  state:", JSON.stringify(await p.evaluate(snap)));
  console.log("  url:", p.url());
  await p.screenshot({ path: "artifacts/booking-step4.png" });

  console.log("ERRORS:", errs.length ? errs.slice(0, 5) : "none");
  await b.close();
})();
