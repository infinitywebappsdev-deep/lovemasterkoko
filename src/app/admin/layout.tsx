"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
        <div className="p-4 border-t border-white/10">
          <Link href="/" className="text-xs text-stone-500 hover:text-white transition-colors">← Back to Site</Link>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-64 min-h-screen">
        <div className="p-6 sm:p-10 pt-16 lg:pt-6">{children}</div>
      </div>
    </div>
  );
}
