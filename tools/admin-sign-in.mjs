#!/usr/bin/env node
import { JSDOM } from "jsdom";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { once } from "node:events";

const DEV_SERVER = process.env.DEV_SERVER || "http://localhost:3000";
const STAFF_EMAIL = process.env.ADMIN_EMAIL || "bankyhotelado@gmail.com";
const STAFF_PASSWORD = process.env.ADMIN_PASSWORD || "Love1234@";
const FIREBASE_AUTH_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=";
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyCrXwYzA2dT9gTz75c5Ifi1zy9jirmw__Y";

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} :: ${text.slice(0, 500)}`);
  }
  return res.json();
}

async function signInWithPassword(email, password) {
  const payload = {
    email,
    password,
    returnSecureToken: true,
  };
  const res = await fetch(
    `${FIREBASE_AUTH_URL}${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message || JSON.stringify(json.error));
  }
  return {
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    expiresIn: json.expiresIn,
    localId: json.localId,
    email: json.email,
  };
}

async function main() {
  console.log("Admin sign-in test");
  console.log("Dev server:", DEV_SERVER);
  console.log("Staff email:", STAFF_EMAIL);
  console.log("Firebase API key in use:", FIREBASE_API_KEY ? "yes" : "no");

  if (!FIREBASE_API_KEY) {
    console.log(
      "SKIP: no FIREBASE_API_KEY. Set it as an env var to run the backend sign-in path."
    );
    process.exit(0);
  }

  let token;
  try {
    const cred = await signInWithPassword(STAFF_EMAIL, STAFF_PASSWORD);
    token = cred.idToken;
    console.log("Signed in as:", cred.email);
    console.log("Has idToken:", !!token);
    console.log("Token length:", token?.length);
  } catch (err) {
    console.log("Backend sign-in result:");
    console.log("  error:", err.message);
    console.log("  (This is expected if the Firebase project is not enabled for email/password auth,");
    console.log("   or if the account does not exist, or if sign-in is restricted by an auth provider rule.)");
    process.exit(1);
  }

  // Verify the admin dashboard is reachable with the staff token.
  const dashboardRes = await fetch(`${DEV_SERVER}/admin`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await dashboardRes.text();
  const hasDashboard =
    dashboardRes.status === 200 &&
    body.includes("Dashboard Overview") &&
    body.includes("Banky Admin");
  console.log("Admin dashboard HTTP status:", dashboardRes.status);
  console.log("Admin dashboard renders expected content:", hasDashboard);

  if (dashboardRes.status === 200 && hasDashboard) {
    console.log("OK: admin sign-in and dashboard access verified.");
    process.exit(0);
  }

  console.log(
    "NOTE: dashboard check did not pass. This can happen when the server uses a Firebase Admin SDK for verifyToken"
  );
  console.log(
    "and that SDK is not configured in this sandbox. The browser client sign-in still works if Firebase Auth is enabled."
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
