"use client";

/**
 * Client-side staff authentication helpers.
 *
 * Every admin API call must go through `adminFetch`, which attaches the
 * Firebase ID token as `Authorization: Bearer <token>` so the server-side
 * `requireStaff()` check in `src/lib/booking/auth.ts` can verify it.
 */
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

/** Current staff user, or null when signed out. */
export function currentAdminUser(): User | null {
  return auth.currentUser;
}

/** Resolve a Firebase ID token for the signed-in staff user. */
export async function getAdminToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/**
 * `fetch` wrapper for admin endpoints. Adds the auth header when a staff
 * session exists, and retries once with a refreshed token if the server
 * answers 401 (expired token).
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = await getAdminToken();

  const buildHeaders = (t: string) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${t}`);
    return headers;
  };

  const res = await fetch(input, {
    ...init,
    ...(token ? { headers: buildHeaders(token) } : {}),
  });

  if (res.status === 401 && token) {
    const fresh = await getAdminToken(true);
    if (fresh && fresh !== token) {
      return fetch(input, { ...init, headers: buildHeaders(fresh) });
    }
  }

  return res;
}

/** Subscribe to Firebase auth state (returns an unsubscribe function). */
export function subscribeAdminUser(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

/** Sign a staff member in with email + password. */
export function adminSignIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Sign the current staff member out. */
export function adminSignOut(): Promise<void> {
  return signOut(auth);
}

/** Friendly message for the common Firebase auth error codes. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact an administrator.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
