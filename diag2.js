// Diag 2: mobile viewport, theme persistence (25s interval), 404 source
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();

  // --- A: 404 source ---
  const p1 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const notFound = [];
  p1.on("response", (r) => { if (r.status() === 404) notFound.push(r.url()); });
  await p1.goto("http://localhost:3000/booking", { waitUntil: "load", timeout: 90000 });
  await p1.waitForTimeout(4000);
  console.log("A) 404s:", notFound.length ? notFound : "none");

  // --- B: theme persistence over 25s (interval reversion test) ---
  const dark0 = await p1.evaluate(() => document.documentElement.classList.contains("dark"));
  await p1.click('button[aria-label*="mode"]');
  await p1.waitForTimeout(500);
  const dark1 = await p1.evaluate(() => document.documentElement.classList.contains("dark"));
  const stored = await p1.evaluate(() => sessionStorage.getItem("banky-theme-manual"));
  console.log(`B) toggle: ${dark0} -> ${dark1}, sessionStorage="${stored}" — waiting 25s for interval...`);
  await p1.waitForTimeout(25000);
  const dark2 = await p1.evaluate(() => document.documentElement.classList.contains("dark"));
  const stored2 = await p1.evaluate(() => sessionStorage.getItem("banky-theme-manual"));
  console.log(`   after 25s: dark=${dark2} (reverted=${dark1 !== dark2}), sessionStorage="${stored2}"`);
  await p1.close();

  // --- C: mobile viewport 390x844 — calendar + toggle ---
  const p2 = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const errs = [];
  p2.on("pageerror", (e) => errs.push(String(e).slice(0, 300)));
  await p2.goto("http://localhost:3000/booking", { waitUntil: "load", timeout: 90000 });
  await p2.waitForTimeout(5000);

  // mobile toggle
  const t0 = await p2.evaluate(() => document.documentElement.classList.contains("dark"));
  const tb = await p2.$('button[aria-label*="mode"]');
  if (tb) { await tb.click(); await p2.waitForTimeout(600); }
  const t1 = await p2.evaluate(() => document.documentElement.classList.contains("dark"));
  console.log(`C) mobile toggle: ${t0} -> ${t1} ${t0 === t1 ? "*** BROKEN ***" : "works"}`);

  // mobile calendar — is it visible and clickable?
  const dayBtns = await p2.$$('button[aria-label*=": Available"], button[aria-label*=": Limited"], button[aria-label*=": Unavailable"]');
  console.log("   mobile day buttons in DOM:", dayBtns.length);
  let target = null;
  for (const b of dayBtns) {
    const lbl = await b.getAttribute("aria-label");
    if (lbl.includes("Available") && !(await b.isDisabled())) { target = { b, lbl }; break; }
  }
  if (target) {
    // is it actually visible in viewport?
    const box = await target.b.boundingBox();
    console.log("   target box:", JSON.stringify(box));
    try {
      await target.b.tap({ timeout: 5000 });
      await p2.waitForTimeout(800);
      const sel = await p2.$$('button[aria-label*="Selected Check-in"]');
      console.log("   after tap -> Selected Check-in:", sel.length, sel.length ? "works" : "*** BROKEN ***");
    } catch (e) {
      console.log("   tap failed:", e.message.split("\n")[0]);
      // what covers it?
      const cover = await p2.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? `${el.tagName}.${String(el.className).slice(0, 120)}` : "nothing";
      }, [box.x + box.width / 2, box.y + box.height / 2]);
      console.log("   element at center:", cover);
    }
  } else {
    console.log("   *** no clickable day on mobile ***");
  }
  console.log("   pageerrors:", errs.length ? errs : "none");
  await p2.close();

  await browser.close();
})().catch((e) => { console.error("DIAG2 FAILED:", e.message.split("\n")[0]); process.exit(1); });
