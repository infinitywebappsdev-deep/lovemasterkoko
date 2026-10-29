"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ScanLine,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Loader2,
  Building2,
  Table,
  Home,
  Sun,
  ClipboardList,
  RefreshCw,
  Download,
  Archive,
  Eye,
} from "lucide-react";
import { QrCodeEntity } from "@/lib/qr-menu/qr-entity";

interface QrCodeWithStatus extends QrCodeEntity {
  qrImageBase64?: string;
}

const LOCATION_ICONS = {
  room: Home,
  table: Table,
  poolside_garden: Sun,
};

const LOCATION_LABELS = {
  room: "Room Service",
  table: "Restaurant Table",
  poolside_garden: "Poolside / Garden",
};

export default function QrCodeManagerPage() {
  const [qrCodes, setQrCodes] = useState<QrCodeWithStatus[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; byType: Record<string, number>; totalOrdersFromQr: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQr, setSelectedQr] = useState<QrCodeWithStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    label: "",
    locationType: "table" as "room" | "table" | "poolside_garden",
    location: "",
    areaDescription: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    label: "",
    locationType: "table" as "room" | "table" | "poolside_garden",
    location: "",
    areaDescription: "",
    isActive: true,
  });

  useEffect(() => {
    fetchQrCodes();
  }, []);

  const fetchQrCodes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterActive === "active") params.set("active", "true");
      else if (filterActive === "inactive") params.set("active", "false");
      if (filterType !== "all") params.set("locationType", filterType);

      const res = await fetch(`/api/qrcodes?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setQrCodes(json.qrCodes || []);
    } catch (err) {
      console.error("Failed to fetch QR codes:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/qrcodes");
      const json = await res.json();
      if (json.ok) {
        const all = json.qrCodes || [];
        const byType: Record<string, number> = {};
        let active = 0;
        for (const qr of all) {
          byType[qr.locationType] = (byType[qr.locationType] || 0) + 1;
          if (qr.isActive) active++;
        }
        setStats({ total: all.length, active, byType, totalOrdersFromQr: 0 });
      }
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/qrcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.ok) {
        setSaveMessage(`QR code "${json.qrCode.label}" created successfully!`);
        setShowCreateModal(false);
        setCreateForm({ label: "", locationType: "table", location: "", areaDescription: "" });
        fetchQrCodes();
        fetchStats();
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      setSaveMessage("Failed to create QR code");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQr) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/qrcodes/${selectedQr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.ok) {
        setSaveMessage(`QR code "${json.qrCode.label}" updated successfully!`);
        setShowEditModal(false);
        setSelectedQr(null);
        fetchQrCodes();
        fetchStats();
        setTimeout(() => setSaveMessage(null), 4000);
      } else {
        setSaveMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      setSaveMessage("Failed to update QR code");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (qr: QrCodeWithStatus) => {
    if (!confirm(`Deactivate QR code "${qr.label}"? It will no longer work for guests.`)) return;
    setDeleting(qr.id);
    try {
      const res = await fetch(`/api/qrcodes/${qr.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setSaveMessage(`QR code "${qr.label}" deactivated.`);
        fetchQrCodes();
        fetchStats();
        setTimeout(() => setSaveMessage(null), 4000);
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleRegenerate = async (qr: QrCodeWithStatus) => {
    if (!confirm(`Regenerate the QR image for "${qr.label}"?`)) return;
    try {
      const res = await fetch(`/api/qrcodes/${qr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateImage: true }),
      });
      const json = await res.json();
      if (json.ok) {
        setSaveMessage(`QR image regenerated for "${qr.label}".`);
        fetchQrCodes();
        setTimeout(() => setSaveMessage(null), 4000);
      }
    } catch (err) {
      setSaveMessage("Failed to regenerate QR image");
    }
  };

  const copyUrl = (qr: QrCodeWithStatus) => {
    navigator.clipboard.writeText(qr.targetUrl);
    setCopiedId(qr.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditModal = (qr: QrCodeWithStatus) => {
    setSelectedQr(qr);
    setEditForm({
      label: qr.label,
      locationType: qr.locationType,
      location: qr.location,
      areaDescription: qr.areaDescription || "",
      isActive: qr.isActive,
    });
    setShowEditModal(true);
  };

  const filteredQrCodes = qrCodes.filter((qr) => {
    if (filterActive === "active" && !qr.isActive) return false;
    if (filterActive === "inactive" && qr.isActive) return false;
    if (filterType !== "all" && qr.locationType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        qr.label.toLowerCase().includes(q) ||
        qr.location.toLowerCase().includes(q) ||
        qr.areaDescription?.toLowerCase().includes(q) ||
        qr.targetUrl.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTypeIcon = (type: string) => {
    const Icon = LOCATION_ICONS[type as keyof typeof LOCATION_ICONS] || ClipboardList;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <ScanLine className="h-7 w-7 text-amber-600" />
          <h1 className="font-display text-2xl sm:text-3xl text-stone-900 dark:text-white font-semibold">
            QR Code Manager
          </h1>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Create, manage, and regenerate unique QR codes for each room, table, and poolside location.
          Guests scan these to access the in-house dining menu.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider mb-1">
            <ClipboardList className="h-3.5 w-3.5" /> Total QR Codes
          </div>
          <span className="font-display text-2xl font-bold text-stone-900 dark:text-white">{stats?.total ?? "—"}</span>
        </div>
        <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider mb-1">
            <Eye className="h-3.5 w-3.5" /> Active
          </div>
          <span className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.active ?? "—"}</span>
        </div>
        <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider mb-1">
            <Table className="h-3.5 w-3.5" /> Tables
          </div>
          <span className="font-display text-2xl font-bold text-stone-900 dark:text-white">{stats?.byType.table ?? 0}</span>
        </div>
        <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-wider mb-1">
            <Home className="h-3.5 w-3.5" /> Rooms
          </div>
          <span className="font-display text-2xl font-bold text-stone-900 dark:text-white">{stats?.byType.room ?? 0}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search QR codes by label, location, or area…"
            className="h-9 px-3 pl-9 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:border-amber-600 w-48 sm:w-64"
          />
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
              className="h-9 pl-8 pr-6 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:border-amber-600 appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <span className="absolute right-2.5 top-2.5 text-stone-400 pointer-events-none">▾</span>
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 pl-6 pr-6 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:border-amber-600 appearance-none cursor-pointer"
            >
              <option value="all">All Locations</option>
              <option value="table">Tables</option>
              <option value="room">Rooms</option>
              <option value="poolside_garden">Poolside / Garden</option>
            </select>
            <span className="absolute right-2.5 top-2.5 text-stone-400 pointer-events-none">▾</span>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" /> New QR Code
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-sm">
          <span>{saveMessage}</span>
          <button onClick={() => setSaveMessage(null)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* QR Code List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </div>
      ) : filteredQrCodes.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center">
          <ScanLine className="h-10 w-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <p className="text-stone-700 dark:text-stone-200 font-medium">
            {qrCodes.length === 0 ? "No QR codes yet." : "No QR codes match your filters."}
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Create a QR code for each room, table, or poolside area to let guests order in-house dining.
          </p>
          {qrCodes.length === 0 && (
            <button onClick={() => setShowCreateModal(true)} className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">
              <Plus className="h-4 w-4 inline mr-1.5" /> Create Your First QR Code
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQrCodes.map((qr) => {
            const Icon = LOCATION_ICONS[qr.locationType] || ClipboardList;
            const isActive = qr.isActive;
            return (
              <div
                key={qr.id}
                className={`bg-white dark:bg-[#1a1815] border rounded-2xl overflow-hidden transition-all ${
                  isActive
                    ? "border-amber-300 dark:border-amber-700/60 shadow-sm"
                    : "border-stone-200 dark:border-stone-800 opacity-70"
                }`}
              >
                {/* QR Image Preview */}
                <div className="bg-stone-50 dark:bg-stone-900/80 p-4 flex items-center justify-center min-h-[140px] border-b border-stone-200 dark:border-stone-800">
                  {qr.qrImageBase64 ? (
                    <Image
                      src={qr.qrImageBase64}
                      alt={`QR code for ${qr.label}`}
                      width={120}
                      height={120}
                      className="object-contain"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400 text-xs">
                      No image
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" : "bg-stone-100 dark:bg-stone-800 text-stone-400"
                      }`}>
                        {isActive ? <ScanLine className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-stone-900 dark:text-white truncate">{qr.label}</h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          <span className="font-medium">{LOCATION_LABELS[qr.locationType]}</span>
                          {qr.areaDescription ? ` · ${qr.areaDescription}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-500"
                    }`}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="text-xs text-stone-500 dark:text-stone-400 font-mono truncate bg-stone-50 dark:bg-stone-900/60 rounded px-2 py-1 border border-stone-200 dark:border-stone-800">
                    {qr.targetUrl}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                      {new Date(qr.createdAt).toLocaleDateString("en-GB")}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyUrl(qr)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          copiedId === qr.id ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
                        }`}
                        title="Copy target URL"
                      >
                        {copiedId === qr.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={() => openEditModal(qr)}
                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors"
                        title="Edit QR code"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(qr)}
                        disabled={deleting === qr.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          deleting === qr.id ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-500 hover:text-red-600 dark:hover:text-red-400"
                        }`}
                        title="Deactivate QR code"
                      >
                        {deleting === qr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <h2 className="font-display text-lg text-stone-900 dark:text-white">Create QR Code</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Label *</label>
                <input
                  type="text"
                  value={createForm.label}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  placeholder="e.g. Table 5, Room 204, Poolside Bar"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Location Type *</label>
                  <select
                    value={createForm.locationType}
                    onChange={(e) => setCreateForm({ ...createForm, locationType: e.target.value as "room" | "table" | "poolside_garden" })}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-600 appearance-none cursor-pointer"
                  >
                    <option value="table">Table</option>
                    <option value="room">Room</option>
                    <option value="poolside_garden">Poolside / Garden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Identifier *</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    placeholder={createForm.locationType === "room" ? "e.g. 204" : createForm.locationType === "poolside_garden" ? "e.g. Lawn Seating" : "e.g. Table 5"}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Area Description (optional)</label>
                <input
                  type="text"
                  value={createForm.areaDescription}
                  onChange={(e) => setCreateForm({ ...createForm, areaDescription: e.target.value })}
                  placeholder="e.g. Executive Lounge, 2nd Floor"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="bg-stone-50 dark:bg-stone-900/60 rounded-lg p-3 text-xs text-stone-500 dark:text-stone-400 space-y-1">
                <p>Preview of guest landing URL:</p>
                <div className="font-mono bg-white dark:bg-stone-900 rounded px-2 py-1.5 border border-stone-200 dark:border-stone-800 truncate text-amber-700 dark:text-amber-300">
                  {typeof window !== "undefined" ? window.location.origin : ""}/qr?{createForm.locationType === "table" ? `table=${createForm.location}` : `room=${createForm.location}`}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create QR Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1815] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <h2 className="font-display text-lg text-stone-900 dark:text-white">Edit QR Code</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Label *</label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Location Type *</label>
                  <select
                    value={editForm.locationType}
                    onChange={(e) => setEditForm({ ...editForm, locationType: e.target.value as "room" | "table" | "poolside_garden" })}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white focus:outline-none focus:border-amber-600 appearance-none cursor-pointer"
                  >
                    <option value="table">Table</option>
                    <option value="room">Room</option>
                    <option value="poolside_garden">Poolside / Garden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Identifier *</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">Area Description</label>
                <input
                  type="text"
                  value={editForm.areaDescription}
                  onChange={(e) => setEditForm({ ...editForm, areaDescription: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 dark:border-stone-600 text-amber-600 focus:ring-amber-500"
                  />
                  Active QR Code
                </label>
                <button
                  type="button"
                  onClick={() => handleRegenerate(selectedQr)}
                  className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="h-3 w-3" /> Regenerate Image
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Edit2 className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
