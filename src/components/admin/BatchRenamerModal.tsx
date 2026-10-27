"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  X,
  Check,
  Calendar,
  BedDouble,
  Tag,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { ROOMS } from "@/lib/hotel";

export interface MediaFileItem {
  name: string;
  size: number;
  mtime: string;
  url: string;
  isReferencedInRooms?: boolean;
  referencedRooms?: string[];
  isBrand?: boolean;
  category?: "room" | "brand" | "orphaned";
}

interface BatchRenamerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: MediaFileItem[];
  selectedFileNames: string[];
  onRenameSuccess: () => void;
}

export function BatchRenamerModal({
  isOpen,
  onClose,
  files,
  selectedFileNames,
  onRenameSuccess,
}: BatchRenamerModalProps) {
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set(selectedFileNames));
  const [patternType, setPatternType] = useState<"slug" | "date" | "slug_date" | "custom">("slug");
  const [selectedRoomSlug, setSelectedRoomSlug] = useState("deluxe");
  const [customPrefix, setCustomPrefix] = useState("room-photo");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startingIndex, setStartingIndex] = useState(1);
  const [zeroPad, setZeroPad] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  // Sync when selectedFileNames changes
  React.useEffect(() => {
    setSelectedNames(new Set(selectedFileNames.length > 0 ? selectedFileNames : files.slice(0, 5).map((f) => f.name)));
  }, [selectedFileNames, files]);

  // Selected files array
  const activeFiles = useMemo(() => {
    return files.filter((f) => selectedNames.has(f.name));
  }, [files, selectedNames]);

  // Generate proposed new names
  const proposedRenames = useMemo(() => {
    return activeFiles.map((file, idx) => {
      const extMatch = file.name.match(/\.[^.]+$/);
      const ext = extMatch ? extMatch[0].toLowerCase() : ".jpg";
      const indexNum = startingIndex + idx;
      const formattedIndex = zeroPad && activeFiles.length >= 10 ? String(indexNum).padStart(2, "0") : String(indexNum);

      let base = "";
      if (patternType === "slug") {
        base = `${selectedRoomSlug}-photo-${formattedIndex}`;
      } else if (patternType === "date") {
        base = `banky-${selectedDate}-${formattedIndex}`;
      } else if (patternType === "slug_date") {
        base = `${selectedRoomSlug}-${selectedDate}-${formattedIndex}`;
      } else {
        base = `${customPrefix || "media"}-${formattedIndex}`;
      }

      const newName = `${base}${ext}`;
      const isUnchanged = file.name === newName;

      return {
        oldName: file.name,
        newName,
        url: file.url,
        isUnchanged,
      };
    });
  }, [activeFiles, patternType, selectedRoomSlug, selectedDate, customPrefix, startingIndex, zeroPad]);

  const toggleSelect = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedNames(new Set(files.map((f) => f.name)));
  };

  const deselectAll = () => {
    setSelectedNames(new Set());
  };

  const handleApply = async () => {
    if (proposedRenames.length === 0) return;
    setSaving(true);
    setError(null);
    setResultMsg(null);

    try {
      const res = await fetch("/api/admin/media/batch-rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renames: proposedRenames.map((r) => ({
            oldName: r.oldName,
            newName: r.newName,
          })),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setResultMsg(`Successfully renamed ${data.count} file(s)!`);
        setTimeout(() => {
          onRenameSuccess();
          onClose();
        }, 1200);
      } else {
        throw new Error(data.message || "Failed to batch rename files");
      }
    } catch (err: any) {
      console.error("Batch rename error:", err);
      setError(err?.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-rename-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#1c1917] border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#24211e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 id="batch-rename-title" className="font-display text-lg text-stone-900 dark:text-white font-medium">
                Batch Rename Media Files
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Apply consistent naming patterns based on Room Slug or Date across {activeFiles.length} selected asset(s).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resultMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{resultMsg}</span>
            </div>
          )}

          {/* Pattern Builder Configuration */}
          <div className="p-5 rounded-2xl bg-stone-50 dark:bg-[#24211e] border border-stone-200 dark:border-stone-800 space-y-4">
            <h3 className="font-condensed uppercase tracking-wider text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[var(--accent)]" />
              <span>1. Choose Consistent Naming Pattern</span>
            </h3>

            {/* Radio options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  patternType === "slug"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-stone-900 dark:text-white font-medium ring-1 ring-[var(--accent)]"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="patternType"
                    checked={patternType === "slug"}
                    onChange={() => setPatternType("slug")}
                    className="accent-[var(--accent)]"
                  />
                  <BedDouble className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-xs font-semibold">By Room Slug</span>
                </div>
                <span className="text-[11px] font-mono text-stone-500 pl-6">
                  {selectedRoomSlug}-photo-1.jpg
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  patternType === "date"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-stone-900 dark:text-white font-medium ring-1 ring-[var(--accent)]"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="patternType"
                    checked={patternType === "date"}
                    onChange={() => setPatternType("date")}
                    className="accent-[var(--accent)]"
                  />
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-semibold">By Date</span>
                </div>
                <span className="text-[11px] font-mono text-stone-500 pl-6">
                  banky-{selectedDate}-1.jpg
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  patternType === "slug_date"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-stone-900 dark:text-white font-medium ring-1 ring-[var(--accent)]"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="patternType"
                    checked={patternType === "slug_date"}
                    onChange={() => setPatternType("slug_date")}
                    className="accent-[var(--accent)]"
                  />
                  <Tag className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold">Slug + Date</span>
                </div>
                <span className="text-[11px] font-mono text-stone-500 pl-6">
                  {selectedRoomSlug}-{selectedDate}-1.jpg
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  patternType === "custom"
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-stone-900 dark:text-white font-medium ring-1 ring-[var(--accent)]"
                    : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="patternType"
                    checked={patternType === "custom"}
                    onChange={() => setPatternType("custom")}
                    className="accent-[var(--accent)]"
                  />
                  <Sliders className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold">Custom Prefix</span>
                </div>
                <span className="text-[11px] font-mono text-stone-500 pl-6">
                  {customPrefix || "custom"}-1.jpg
                </span>
              </label>
            </div>

            {/* Pattern Settings: Slug picker or Date input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {(patternType === "slug" || patternType === "slug_date") && (
                <div>
                  <label className="block text-xs font-condensed uppercase tracking-wider text-stone-500 mb-1">
                    Select Room Slug
                  </label>
                  <select
                    value={selectedRoomSlug}
                    onChange={(e) => setSelectedRoomSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200"
                  >
                    {ROOMS.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.name} ({r.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(patternType === "date" || patternType === "slug_date") && (
                <div>
                  <label className="block text-xs font-condensed uppercase tracking-wider text-stone-500 mb-1">
                    Date Stamp
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200"
                  />
                </div>
              )}

              {patternType === "custom" && (
                <div>
                  <label className="block text-xs font-condensed uppercase tracking-wider text-stone-500 mb-1">
                    Custom Prefix
                  </label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="e.g. garden-pool"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-condensed uppercase tracking-wider text-stone-500 mb-1">
                  Start Index
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={startingIndex}
                  onChange={(e) => setStartingIndex(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200"
                />
              </div>
            </div>
          </div>

          {/* Selection and Live Preview Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-condensed uppercase tracking-wider text-xs font-bold text-stone-700 dark:text-stone-300">
                2. Live Preview ({activeFiles.length} files to rename)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-[var(--accent)] hover:underline font-medium"
                >
                  Select All ({files.length})
                </button>
                <span className="text-stone-300 dark:text-stone-700">·</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-stone-500 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-100 dark:divide-stone-800 max-h-72 overflow-y-auto">
              {files.map((file) => {
                const isSelected = selectedNames.has(file.name);
                const proposed = proposedRenames.find((r) => r.oldName === file.name);

                return (
                  <div
                    key={file.name}
                    onClick={() => toggleSelect(file.name)}
                    className={`p-3 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : "hover:bg-stone-50 dark:hover:bg-stone-900/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(file.name)}
                        className="rounded accent-[var(--accent)]"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="w-9 h-9 rounded bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-mono text-xs text-stone-700 dark:text-stone-300 truncate max-w-[200px]">
                        {file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                      {isSelected && proposed ? (
                        <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {proposed.newName}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400 italic">Excluded</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#24211e]">
          <div className="text-xs text-stone-500">
            Files will be updated in <code className="bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">public/images/</code>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={saving || activeFiles.length === 0}
              className="px-6 py-2.5 rounded-xl bg-[#1b1b1b] dark:bg-white text-white dark:text-black font-condensed uppercase tracking-wider text-xs font-semibold shadow hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Renaming Files...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span>Apply Batch Rename ({activeFiles.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
