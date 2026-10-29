const { chromium, devices } = require("playwright");
const PORT = process.argv[2] || "3000";
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ ...devices["iPhone 13"] })).newPage();
  await p.addInitScript(() => {
    window.__rdt = { inject: 0, commits: 0, unmounts: 0, errors: [] };
    const setup = () => {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook) return false;
      const orig = { inject: hook.inject, commit: hook.onCommitFiberRoot, unmount: hook.onCommitFiberUnmount };
      hook.inject = function (renderer) { window.__rdt.inject++; try { return orig.inject && orig.inject.apply(this, arguments); } catch (e) { window.__rdt.errors.push("inject:" + e.message); } };
      hook.onCommitFiberRoot = function (id, root) { window.__rdt.commits++; window.__rdt.lastContainer = root && root.containerInfo ? (root.containerInfo.tagName || String(root.containerInfo)) : "?"; try { return orig.commit && orig.commit.apply(this, arguments); } catch (e) { window.__rdt.errors.push("commit:" + e.message); } };
      hook.onCommitFiberUnmount = function () { window.__rdt.unmounts++; try { return orig.unmount && orig.unmount.apply(this, arguments); } catch (e) {} };
      return true;
    };
    if (!setup()) {
      // hook not created yet (it's added by a devtools script); create a shim now
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { renderers: new Map(), inject: (r) => { window.__rdt.inject++; return 1; }, onCommitFiberRoot: () => { window.__rdt.commits++; }, onCommitFiberUnmount: () => {}, onPostCommitFiberRoot: () => {}, isDisabled: false, supportsFiber: true, checkDCE: () => {} };
      setup();
    }
  });
  p.on("pageerror", e => console.log("PAGEERROR:", e.message.slice(0, 300)));
  await p.goto("http://127.0.0.1:" + PORT + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(7000);
  const r = await p.evaluate(() => window.__rdt);
  console.log("PORT " + PORT + ":", JSON.stringify(r));
  await b.close();
})();
