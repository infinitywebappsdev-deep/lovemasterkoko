const { chromium, devices } = require("playwright");

const readState = () => ({
  dates: document.body.innerText.match(/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{4}\b/g)?.slice(0, 6) || [],
  nights: document.body.innerText.match(/\b\d+\s*nights?\b/i)?.[0] || null,
  warn: [...document.body.innerText.matchAll(/(sold out[^\n]{0,70}|minimum stay[^\n]{0,55}|cannot span[^\n]{0,60}|no rooms[^\n]{0,50})/gi)].slice(0, 3).map((m) => m[0]),
  selectedCells: [...document.querySelectorAll("button")]
    .filter((b) => /bg-\[#|ring|accent/.test(String(b.className)) && /^\d{1,2}/.test((b.innerText || "").trim()))
    .map((b) => b.innerText.trim().split("\n")[0])
    .slice(0, 6),
});

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("PE:" + e.message.slice(0, 250)));
  p.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404")) errs.push("CE:" + m.text().slice(0, 250));
  });

  await p.goto("http://127.0.0.1:3000/booking", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);

  const clickDay = (label) =>
    p.evaluate((lab) => {
      const el = [...document.querySelectorAll("button")].find(
        (b) => b.offsetHeight > 0 && (b.innerText || "").trim().split("\n")[0].trim() === lab && String(b.className).includes("h-14")
      );
      if (!el) return "not-found";
      if (el.disabled) return "disabled";
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return "clicked";
    }, label);

  console.log("initial:", JSON.stringify(await p.evaluate(readState)));
  console.log("click 30:", await clickDay("30"));
  await p.waitForTimeout(900);
  console.log("state:", JSON.stringify(await p.evaluate(readState)));
  console.log("click 31:", await clickDay("31"));
  await p.waitForTimeout(1200);
  console.log("state:", JSON.stringify(await p.evaluate(readState)));

  // CTA
  const ctaInfo = await p.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((b) => /FIND AVAILABLE SUITES/i.test(b.innerText || ""));
    if (!el) return "no-cta";
    return { text: el.innerText.trim(), disabled: el.disabled, cls: String(el.className).slice(0, 60) };
  });
  console.log("CTA:", JSON.stringify(ctaInfo));

  const clicked = await p.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((b) => /FIND AVAILABLE SUITES/i.test(b.innerText || ""));
    if (!el || el.disabled) return "unavailable";
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return "clicked";
  });
  console.log("CTA clicked:", clicked);
  await p.waitForTimeout(3000);
  console.log("url:", p.url());
  console.log("after CTA:", JSON.stringify(await p.evaluate(readState)));

  console.log("ERRORS:", errs.length ? errs.slice(0, 5) : "none");
  await p.screenshot({ path: "artifacts/booking-after-cta.png" });
  await b.close();
})();
