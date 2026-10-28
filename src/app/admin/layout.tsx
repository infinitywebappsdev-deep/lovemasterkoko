"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  BellRing,
  Settings,
  Menu,
  X,
  Image as ImageIcon,
  ReceiptText,
  Film,
  Loader2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeAdminUser, adminSignOut } from "@/lib/admin-auth";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/home-media", label: "Home Media Center", icon: Film },
  { to: "/admin/reservations", label: "Reservations", icon: CalendarRange },
  { to: "/admin/transactions", label: "Transaction Audit", icon: ReceiptText },
  { to: "/admin/rooms", label: "Rooms", icon: BedDouble },
  { to: "/admin/media", label: "Room Photos & Media", icon: ImageIcon },
  { to: "/admin/qr-orders", label: "Kitchen / Bar Orders", icon: BellRing },
  { to: "/admin/settings", label: "Payment & Settings", icon: Settings },
];

const LOGIN_PATH = "/admin/login";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Track the Firebase staff session. `checking` stays true until Firebase has
  // restored any persisted session, so we never bounce a signed-in user.
  useEffect(() => subscribeAdminUser((next) => {
    setUser(next);
    setChecking(false);
  }), []);

  // Server-side APIs already reject anonymous callers; this gate just keeps
  // the UI out of sight until the staff member signs in.
  useEffect(() => {
    if (checking) return;
    if (!user && pathname !== LOGIN_PATH) router.replace(LOGIN_PATH);
    if (user && pathname === LOGIN_PATH) router.replace("/admin");
  }, [checking, user, pathname, router]);

  // The login page renders full-screen, without the admin chrome.
  if (pathname === LOGIN_PATH) return <>{children}</>;

  if (checking || !user) {
    return (
      <div className="min-h-screen bg-[#1b1b1b] flex flex-col items-center justify-center gap-3 text-stone-400">
        <Loader2 className="h-6 w-6 animate-spin text-[#ffbf00]" />
        <p className="text-sm">Verifying staff access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] pt-0">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-50 bg-[#1b1b1b] text-white px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="font-display text-lg">Banky Admin</Link>
        <button onClick={() => setOpen(!open)} className="p-2"><Menu className="h-5 w-5" /></button>
      </div>

      {/* Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 bg-[#1b1b1b] text-white flex flex-col transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="font-display text-xl">Banky Admin</Link>
            <button onClick={() => setOpen(false)} className="lg:hidden p-1"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link key={item.to} href={item.to} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors", active ? "bg-[#ffbf00]/20 text-[#ffbf00]" : "text-stone-400 hover:bg-white/5 hover:text-white")}>
                <Icon className="h-4 w-4" /><span className="font-condensed uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          <p className="text-[11px] text-stone-500 truncate" title={user.email ?? ""}>
            Signed in as <span className="text-stone-300">{user.email}</span>
          </p>
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="text-xs text-stone-500 hover:text-white transition-colors">← Back to Site</Link>
            <button
              type="button"
              onClick={() => adminSignOut()}
              className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-[#ffbf00] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-64 min-h-screen">
        <div className="p-6 sm:p-10 pt-16 lg:pt-6">{children}</div>
      </div>
    </div>
  );
}
