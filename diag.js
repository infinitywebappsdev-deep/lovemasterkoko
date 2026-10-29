// Diagnostic: does the booking page hydrate? Do calendar + theme toggle work?
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const logs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      logs.push(`[${m.type()}] ${m.text().slice(0, 400)}`);
  });
  page.on("pageerror", (e) => logs.push(`[pageerror] ${String(e).slice(0, 400)}`));

  console.log("== loading /booking");
  await page.goto("http://localhost:3000/booking", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(5000);

  // --- Test 1: theme toggle (header) ---
  const darkBefore = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  const toggleBtn = await page.$('button[aria-label*="mode"]');
  console.log("toggle button found:", !!toggleBtn);
  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForTimeout(600);
  }
  const darkAfter = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  console.log("THEME:", darkBefore, "->", darkAfter, darkBefore === darkAfter ? "*** BROKEN ***" : "works");

  // --- Test 2: calendar date selection ---
  // Day buttons carry aria-labels like "2026-11-15: Available"
  await page.waitForTimeout(1500);
  const dayBtns = await page.$$('button[aria-label*=": Available"]');
  console.log("available day buttons:", dayBtns.length);

  // Find an enabled, future, not-today button
  let clicked = null;
  for (const b of dayBtns) {
    const disabled = await b.isDisabled();
    const label = await b.getAttribute("aria-label");
    if (!disabled && !label.includes("Selected")) { clicked = { b, label }; break; }
  }
  if (clicked) {
    console.log("clicking date:", clicked.label);
    await clicked.b.click();
    await page.waitForTimeout(800);
    // Did state change? Look for check-in text in the calendar summary
    const bodyText = await page.evaluate(() => document.body.innerText);
    const selCount = (bodyText.match(/Selected Check-in/g) || []).length;
    const nightsShown = /night/.test(bodyText);
    const ariaSel = await page.$$('button[aria-label*="Selected Check-in"]');
    console.log("after click -> Selected Check-in aria buttons:", ariaSel.length, selCount > 0 || ariaSel.length > 0 ? "*** selection WORKS ***" : "*** BROKEN: no state change ***");

    // Try picking a check-out 3 days later
    const parts = clicked.label.split(":")[0].split("-");
    const d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2] + 3));
    const outStr = d.toISOString().slice(0, 10);
    const outBtn = await page.$(`button[aria-label="${outStr}: Available"]`);
    if (outBtn && !(await outBtn.isDisabled())) {
      await outBtn.click();
      await page.waitForTimeout(600);
      const co = await page.$$('button[aria-label*="Selected Check-out"]');
      console.log("check-out pick:", co.length ? "works" : "*** BROKEN ***");
    } else {
      console.log("check-out button unavailable:", outStr);
    }
  } else {
    console.log("*** BROKEN: no clickable day buttons at all ***");
  }

  // --- Test 3: search button enabled after dates ---
  const searchBtn = await page.$('button:has-text("Find Available Suites")');
  if (searchBtn) {
    const disabled = await searchBtn.isDisabled();
    console.log("search button disabled:", disabled);
    if (!disabled) {
      await searchBtn.click();
      await page.waitForTimeout(4000);
      const t = await page.evaluate(() => document.body.innerText);
      console.log("after search, step 2 visible:", /Available Suites/.test(t));
    }
  }

  console.log("\n== console/page errors (" + logs.length + ") ==");
  logs.slice(0, 15).forEach((l) => console.log(l));

  await browser.close();
})().catch((e) => {
  console.error("DIAG FAILED:", e.message);
  process.exit(1);
});
