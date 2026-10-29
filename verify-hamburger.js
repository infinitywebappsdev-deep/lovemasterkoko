// The exact user scenario: impatient double-tap + full open/close/navigate cycle
const { chromium } = require("playwright");

const overlayOpen = (page) =>
  page.evaluate(() => {
    const o = document.querySelector("header > .fixed.inset-0");
    if (!o) return { open: false };
    const cs = getComputedStyle(o);
    return { open: true, opacity: Number(cs.opacity), anim: cs.animationDuration, bodyLocked: document.body.style.overflow === "hidden" };
  });

(async () => {
  const browser = await chromium.launch();
  const results = [];

  // ===== MOBILE =====
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  m.on("pageerror", (e) => results.push("PAGEERROR: " + String(e).slice(0, 200)));
  await m.goto("http://localhost:3000/", { waitUntil: "load", timeout: 90000 });
  await m.waitForTimeout(4000);

  const btn = await m.$('header button[aria-label="Open menu"]');
  const box = await btn.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;

  // --- Scenario: tap, then tap again 150ms later at the same spot ---
  await m.touchscreen.tap(cx, cy);
  await m.waitForTimeout(150);
  await m.touchscreen.tap(cx, cy); // impatient second tap -> lands on invisible overlay logo
  await m.waitForTimeout(400);
  let s = await overlayOpen(m);
  results.push(`double-tap race: menu stays open = ${s.open && s.bodyLocked ? "PASS" : "FAIL"} ${JSON.stringify(s)}`);

  // fade duration check
  results.push(`fade duration: ${s.anim} ${s.anim === "0.18s" ? "PASS" : "CHECK"}`);

  // menu fully visible
  await m.waitForTimeout(400);
  s = await overlayOpen(m);
  const hasNav = await m.evaluate(() => {
    const o = document.querySelector("header > .fixed.inset-0");
    return o ? o.innerText.toUpperCase().includes("NAVIGATION MENU") : false;
  });
  results.push(`menu visible after open: opacity=${s.opacity} nav=${hasNav} ${s.opacity > 0.9 && hasNav ? "PASS" : "FAIL"}`);

  // close via X
  const x = await m.$('header > .fixed.inset-0 button[aria-label="Close menu"]');
  if (x) { await x.click(); await m.waitForTimeout(500); }
  const closed = await overlayOpen(m);
  results.push(`close via X: ${!closed.open ? "PASS" : "FAIL"}`);

  // reopen + navigate via a nav link
  await m.touchscreen.tap(cx, cy);
  await m.waitForTimeout(600);
  const link = await m.$('header a[href="/rooms"]:visible');
  if (link) {
    await link.click();
    await m.waitForTimeout(2500);
    results.push(`nav to /rooms: ${m.url().includes("/rooms") ? "PASS" : "FAIL"} url=${m.url()}`);
    // menu must be closed after navigating
    const after = await overlayOpen(m);
    results.push(`menu closed after nav: ${!after.open ? "PASS" : "FAIL"}`);
  } else {
    results.push("nav link: FAIL (not found)");
  }
  await m.close();

  // ===== DESKTOP =====
  const d = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await d.goto("http://localhost:3000/", { waitUntil: "load", timeout: 90000 });
  await d.waitForTimeout(4000);
  const pill = await d.$('header button[aria-label="Open menu"]:visible');
  if (pill) {
    await pill.click();
    await d.waitForTimeout(120);
    // double click race on desktop
    const b2 = await pill.boundingBox().catch(() => null);
    if (b2) { await d.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2); }
    await d.waitForTimeout(500);
    const s2 = await overlayOpen(d);
    results.push(`desktop double-click: stays open = ${s2.open ? "PASS" : "FAIL"} ${JSON.stringify(s2)}`);
    await d.screenshot({ path: "artifacts/menu-final.png", clip: { x: 0, y: 0, width: 1440, height: 800 } });
  } else {
    results.push("desktop pill: FAIL (not found)");
  }
  await d.close();

  console.log(results.join("\n"));
  await browser.close();
})().catch((e) => { console.error("FAILED:", e.message.split("\n")[0]); process.exit(1); });
