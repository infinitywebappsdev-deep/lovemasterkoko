const { chromium, devices } = require("playwright");
const slugs = [
  "luxury-suite", "luxury", "super-executive", "executive", "standard-plus",
  "deluxe", "studio", "standard",
];

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const bad = new Set();
  p.on("response", (r) => {
    if (r.status() >= 400 && /\/images\//.test(r.url())) bad.add(decodeURIComponent(r.url()).split("/images/")[1]);
  });

  await p.goto("http://127.0.0.1:3000/rooms", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);

  for (const s of slugs) {
    await p.goto("http://127.0.0.1:3000/rooms/" + s, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(3000);
    // scroll through gallery to force all thumbs to load
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(2500);
  }
  console.log("BROKEN IMAGE FILES:");
  console.log([...bad].sort().map((f) => "  " + f).join("\n"));
  await b.close();
})();
