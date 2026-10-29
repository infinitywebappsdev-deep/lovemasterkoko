#!/usr/bin/env node
import { fetch } from "node:http";

const BASE = process.env.PREVIEW_BASE_URL || "http://localhost:3000";

async function main() {
  const loginUrl = `${BASE}/admin/login`;
  const res = await fetch(loginUrl, { method: "GET" });
  const status = res.status;
  const text = await res.text();
  const hasForm = text.includes('class="bg-[#232323] border border-white/10 rounded-xl p-6 space-y-4"') ||
                  text.includes('Banky Admin') &&
                  text.includes('Sign In') &&
                  text.includes('type="email"') &&
                  text.includes('type="password"');

  console.log("admin/login HTTP status:", status);
  console.log("Has login form:", hasForm);

  if (status === 200 && hasForm) {
    console.log("OK: admin login page is reachable and renders the sign-in form.");
    process.exit(0);
  }

  console.log("FAIL: admin login page check did not pass.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
