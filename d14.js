const { chromium, devices } = require("playwright");
const PORT = process.argv[2] || "3000";
const BASE = "http://127.0.0.1:" + PORT;

(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push("PE:" + e.message.slice(0, 250)));
  p.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404")) errs.push("CE:" + m.text().slice(0, 250));
  });

  await p.goto(BASE + "/booking", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(5000);

  const hyd = await p.evaluate(() => {
    let n = 0;
    document.querySelectorAll("body *").forEach((el) => {
      if (Object.keys(el).some((k) => k.startsWith("__reactFiber"))) n++;
    });
    return n;
  });
  console.log("hydrated nodes:", hyd);

  // What date-ish controls exist?
  const controls = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll("button, input, [role=button]").forEach((el) => {
      const t = (el.innerText || el.value || el.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 45);
      if (/tonight|tomorrow|weekend|check.?in|check.?out|quick stay|date/i.test(t) || /check/i.test(el.getAttribute("aria-label") || "")) {
        out.push({
          tag: el.tagName,
          text: t,
          cls: String(el.className).slice(0, 60),
          disabled: !!el.disabled,
        });
      }
    });
    return out.slice(0, 20);
  });
  console.log("DATE CONTROLS:", JSON.stringify(controls, null, 1));

  // Click "Tonight"
  const tonight = p.getByText(/Tonight\s*\(1 nt\)/i).first();
  if (await tonight.count()) {
    const before = await p.evaluate(() => document.body.innerText.match(/check-in[\s\S]{0,80}/i)?.[0]?.slice(0, 80));
    await tonight.click().catch((e) => console.log("click err:", e.message.slice(0, 120)));
    await p.waitForTimeout(900);
    const after = await p.evaluate(() => document.body.innerText.slice(0, 4000));
    const checkInShown = after.match(/(\d{1,2}\s+\w{3},?\s+\d{4})/g)?.slice(0, 4);
    console.log("after Tonight click, dates on page:", JSON.stringify(checkInShown));
    console.log("warnings:", JSON.stringify(after.match(/sold out[^\n]{0,80}|minimum stay[^\n]{0,60}/gi)?.slice(0, 3) || []));
  } else {
    console.log("Tonight button NOT FOUND");
  }

  console.log("ERRORS:", errs.length ? errs.slice(0, 4) : "none");
  await b.close();
})();
