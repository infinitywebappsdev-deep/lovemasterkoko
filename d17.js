const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  await p.goto("http://127.0.0.1:3000/booking", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);
  const btns = await p.evaluate(() => [...document.querySelectorAll("button,a,[role=button]")].filter(e=>e.offsetHeight>0).map(e => ({ t:(e.innerText||"").trim().replace(/\s+/g," ").slice(0,40), cls:String(e.className).slice(0,40) })).filter(x=>x.t).slice(0,45));
  console.log(JSON.stringify(btns, null, 0).replace(/\},\{/g, "},\n{"));
  await p.screenshot({ path: "artifacts/booking-top.png" });
  // open the check-in picker
  const trig = p.locator("button").filter({ hasText: /check.?in/i }).first();
  console.log("checkin trigger count:", await p.locator("button").filter({ hasText: /check.?in/i }).count());
  await trig.click({ timeout: 5000 }).catch(e => console.log("click err:", e.message.slice(0,100)));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: "artifacts/booking-calendar-open.png" });
  const cells = await p.evaluate(() => [...document.querySelectorAll("button")].filter(b=>b.offsetHeight>0 && /^\d{1,2}$/.test((b.innerText||"").trim())).length);
  console.log("day cells after opening:", cells);
  await b.close();
})();
