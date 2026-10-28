"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LockKeyhole, ArrowLeft } from "lucide-react";
import { adminSignIn, authErrorMessage, subscribeAdminUser } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    return subscribeAdminUser((user) => {
      if (user) router.replace("/admin");
    });
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await adminSignIn(email, password);
      router.replace("/admin");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1b1b1b] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ffbf00]/15 text-[#ffbf00] mb-4">
            <LockKeyhole className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl text-white">Banky Admin</h1>
          <p className="text-sm text-stone-400 mt-1">Staff sign-in required</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#232323] border border-white/10 rounded-xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-condensed uppercase tracking-wider text-stone-400 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-[#1b1b1b] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ffbf00] transition-colors"
              placeholder="you@bankyhotelandsuites.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-condensed uppercase tracking-wider text-stone-400 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-[#1b1b1b] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-[#ffbf00] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-gold w-full py-3 text-xs inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to the website
          </Link>
        </p>
      </div>
    </div>
  );
}
