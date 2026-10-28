"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Search,
  KeyRound,
  XCircle,
  LogIn,
  LogOut,
  RefreshCw,
  X,
  Filter,
  Calendar,
  User,
  Mail,
  Hash,
  Copy,
  Check,
} from "lucide-react";
import { naira } from "@/lib/hotel";
import type { Reservation } from "@/lib/booking/types";
import { adminFetch } from "@/lib/admin-auth";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
  checked_in: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800",
  checked_out: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-300 dark:border-stone-700",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800",
  no_show: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900",
  inquiry: "bg-stone-100 text-stone-600 dark:bg-stone-800/80 dark:text-stone-400 border border-stone-200 dark:border-stone-700",
};

export default function AdminReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/reservations?limit=200");
      const j = await res.json();
      if (j.ok) setReservations(j.data.reservations);
      else if (j.error === "UNAUTHORIZED") setAuthError(true);
    } catch {
      /* leave list empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = useCallback(
    async (reservationId: string, body: Record<string, unknown>) => {
      setBusyId(reservationId);
      setMessage(null);
      try {
        const res = await adminFetch("/api/admin/reservations/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId, ...body }),
        });
        const j = await res.json();
        setMessage(j.ok ? "Done." : j.message || "Action failed.");
        if (j.ok) await load();
      } catch {
        setMessage("Action failed.");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const filtered = reservations.filter((r) => {
    const q = search.trim().toLowerCase();
    
    // Status filter
    if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }

    if (!q) return true;

    // Search filter across reservation ID, booking reference, guestName, guestEmail, room, and phone
    const idMatch = Boolean(r.id && r.id.toLowerCase().includes(q));
    const refMatch = Boolean(r.reference && r.reference.toLowerCase().includes(q));
    const nameMatch = Boolean(r.guestName && r.guestName.toLowerCase().includes(q));
    const emailMatch = Boolean(r.guestEmail && r.guestEmail.toLowerCase().includes(q));
    const roomMatch = Boolean(r.roomTypeName && r.roomTypeName.toLowerCase().includes(q));
    const phoneMatch = Boolean((r as any).guestPhone && String((r as any).guestPhone).toLowerCase().includes(q));

    return idMatch || refMatch || nameMatch || emailMatch || roomMatch || phoneMatch;
  });

  if (authError) {
    return (
      <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-xl p-10 text-center shadow-sm">
        <h2 className="font-display text-xl text-[#222] dark:text-white mb-2">Staff sign-in required</h2>
        <p className="text-sm text-[#666] dark:text-stone-400">
          Sign in with a staff account to view and manage reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#222] dark:text-white font-semibold">
            Reservations
          </h1>
          <p className="text-xs sm:text-sm text-[#666] dark:text-stone-400 mt-0.5">
            Manage bookings, confirmations, check-ins, payments, and room assignment.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs font-condensed uppercase tracking-wider text-[#666] hover:text-[var(--accent)] dark:text-stone-400 dark:hover:text-amber-400 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-amber-700 dark:text-amber-400 hover:text-amber-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Search Bar & Filter Controls ── */}
      <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by guest name or reservation ID (e.g. Adebayo, BK-2026, or doc ID)..."
              aria-label="Filter reservations by guest name or reservation ID"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-stone-50 dark:bg-[#232019] border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-[var(--accent)] text-stone-900 dark:text-white placeholder:text-stone-400 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search query"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap pl-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter reservations by status"
              className="px-3 py-2 text-xs font-medium bg-stone-50 dark:bg-[#232019] border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-[var(--accent)] text-stone-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Statuses ({reservations.length})</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Search & Filter Meta Bar */}
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-stone-800 dark:text-stone-200">{filtered.length}</strong> of {reservations.length} reservation{reservations.length === 1 ? "" : "s"}
            </span>
            {(search || statusFilter !== "all") && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                (filtered)
              </span>
            )}
          </div>

          {(search || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ── Reservations Table ── */}
      <div className="bg-white dark:bg-[#1a1815] border border-[#ece6dd] dark:border-[#2e2b26] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-stone-500 dark:text-stone-400 text-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
            <span>Loading reservation records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-500 dark:text-stone-400 text-sm space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-stone-800 dark:text-stone-200">No matching reservations found</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {search
                  ? `No booking records match "${search}". Try searching by another name, email address, or reference code.`
                  : "No reservations found for the selected status."}
              </p>
            </div>
            {(search || statusFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear search &amp; filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f5f0] dark:bg-[#232019] border-b border-[#ece6dd] dark:border-[#2e2b26]">
                <tr>
                  {["Reservation ID / Ref", "Guest", "Room", "Dates", "Total", "Status", "Payment", "Actions"].map((h) => (
                    <th key={h} className="text-left p-3.5 font-condensed uppercase tracking-wider text-xs text-[#666] dark:text-stone-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece6dd]/60 dark:divide-[#2e2b26]/60">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors align-top">
                    <td className="p-3.5 font-mono text-stone-900 dark:text-white whitespace-nowrap">
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <span>{r.reference}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(r.reference, `ref-${r.id}`)}
                          title="Copy booking reference"
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                        >
                          {copiedId === `ref-${r.id}` ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      {r.id && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-normal">
                          <span className="text-stone-400 text-[10px] uppercase font-condensed">ID:</span>
                          <span className="truncate max-w-[130px] font-mono select-all" title={r.id}>
                            {r.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(r.id, `id-${r.id}`)}
                            title="Copy Firestore reservation ID"
                            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                          >
                            {copiedId === `id-${r.id}` ? (
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-2.5 w-2.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-stone-800 dark:text-stone-200">
                      <div className="font-medium">{r.guestName}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 font-mono">{r.guestEmail}</div>
                      {(r as any).guestPhone && (
                        <div className="text-xs text-stone-400 dark:text-stone-500">{(r as any).guestPhone}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-stone-800 dark:text-stone-200 whitespace-nowrap">
                      <div>{r.roomTypeName}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        {r.assignedRoomNumber ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Rm {r.assignedRoomNumber}
                          </span>
                        ) : (
                          <span className="italic text-stone-400">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-stone-800 dark:text-stone-200 whitespace-nowrap text-xs">
                      <div>{r.checkIn} → {r.checkOut}</div>
                      <div className="text-stone-500 dark:text-stone-400">
                        {r.nights} night{r.nights > 1 ? "s" : ""} · {r.adults + r.children} guest{r.adults + r.children > 1 ? "s" : ""}
                      </div>
                    </td>
                    <td className="p-3.5 text-stone-800 dark:text-stone-200 whitespace-nowrap">
                      <div className="font-semibold">{naira(r.pricing.grandTotal / 100)}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-400">
                        paid {naira(r.pricing.amountPaid / 100)}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${STATUS_STYLES[r.status] ?? "bg-stone-100 text-stone-700"}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-stone-800 dark:text-stone-200 whitespace-nowrap font-medium capitalize">
                      {r.paymentStatus}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {busyId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                        ) : (
                          <>
                            {r.status === "confirmed" && (
                              <button
                                onClick={() => act(r.id, { action: "transition", status: "checked_in" })}
                                title="Check in guest"
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors"
                              >
                                <LogIn className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {r.status === "checked_in" && (
                              <button
                                onClick={() => act(r.id, { action: "transition", status: "checked_out" })}
                                title="Check out guest"
                                className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 transition-colors"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {["pending", "confirmed"].includes(r.status) && !r.assignedRoomNumber && (
                              <button
                                onClick={() => {
                                  const n = window.prompt("Assign room number:");
                                  if (n) act(r.id, { action: "assign_room", roomNumber: n.trim() });
                                }}
                                title="Assign room number"
                                className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {["pending", "confirmed"].includes(r.status) && (
                              <button
                                onClick={() => {
                                  const reason = window.prompt("Cancellation reason:");
                                  if (reason !== null) act(r.id, { action: "cancel", reason });
                                }}
                                title="Cancel reservation"
                                className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
