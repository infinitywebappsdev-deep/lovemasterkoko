"use client";

import React, { useState, useMemo } from "react";
import {
  FileQuestion,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Copy,
  Check,
  Search,
  Filter,
  FileText,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { MediaFileItem } from "./BatchRenamerModal";

interface AuditSummary {
  totalFiles: number;
  totalBytes: number;
  referencedFilesCount: number;
  orphanedFilesCount: number;
  orphanedBytes: number;
  roomConfigsCount: number;
  scannedAt: string;
}

interface UsageAuditReportProps {
  files: MediaFileItem[];
  summary: AuditSummary | null;
  onOpenBatchRenameWithFiles: (fileNames: string[]) => void;
  onDeleteFile?: (fileName: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function UsageAuditReport({
  files,
  summary,
  onOpenBatchRenameWithFiles,
  onDeleteFile,
}: UsageAuditReportProps) {
  const [filter, setFilter] = useState<"all" | "orphaned" | "referenced" | "brand">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      // Filter tab
      if (filter === "orphaned" && (f.isReferencedInRooms || f.isBrand)) return false;
      if (filter === "referenced" && !f.isReferencedInRooms) return false;
      if (filter === "brand" && !f.isBrand) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesRoom = f.referencedRooms?.some((r) => r.toLowerCase().includes(q));
        return matchesName || matchesRoom;
      }
      return true;
    });
  }, [files, filter, searchQuery]);

  const orphanedFiles = useMemo(() => {
    return files.filter((f) => !f.isReferencedInRooms && !f.isBrand);
  }, [files]);

  const copyPath = (name: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(`/images/${name}`);
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-condensed uppercase tracking-wider font-bold mb-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span>Storage &amp; Integrity Analysis</span>
          </div>
          <h2 className="font-display text-2xl text-stone-900 dark:text-white">
            Media Usage Audit Report
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Cross-references physical files in <code className="bg-stone-200 dark:bg-stone-800 px-1 py-0.5 rounded font-mono">public/images/</code> against live database room configurations.
          </p>
        </div>

        {orphanedFiles.length > 0 && (
          <button
            type="button"
            onClick={() => onOpenBatchRenameWithFiles(orphanedFiles.map((f) => f.name))}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-condensed uppercase tracking-wider text-xs font-semibold shadow-sm transition-all self-start sm:self-auto cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Batch Rename All Orphaned ({orphanedFiles.length})</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assets */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#201d19] border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <span className="text-[11px] font-condensed uppercase tracking-wider text-stone-500 block font-semibold">
            Total Scanned Assets
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl text-stone-900 dark:text-white font-bold">
              {summary?.totalFiles ?? files.length}
            </span>
            <span className="text-xs text-stone-500 font-mono">
              ({formatBytes(summary?.totalBytes ?? 0)})
            </span>
          </div>
          <span className="text-[11px] text-stone-400 block truncate">
            Across {summary?.roomConfigsCount ?? 8} database room types
          </span>
        </div>

        {/* Orphaned Assets */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 shadow-sm space-y-1">
          <span className="text-[11px] font-condensed uppercase tracking-wider text-amber-700 dark:text-amber-400 block font-semibold flex items-center gap-1.5">
            <FileQuestion className="h-3.5 w-3.5" />
            <span>Orphaned Files</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl text-amber-900 dark:text-amber-200 font-bold">
              {orphanedFiles.length}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-mono">
              ({formatBytes(summary?.orphanedBytes ?? 0)})
            </span>
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400/80 block">
            Not referenced in room configs
          </span>
        </div>

        {/* Database Referenced */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-1">
          <span className="text-[11px] font-condensed uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Room Config Active</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl text-emerald-900 dark:text-emerald-200 font-bold">
              {summary?.referencedFilesCount ?? files.filter((f) => f.isReferencedInRooms).length}
            </span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400/80 block">
            Linked to guest room pages
          </span>
        </div>

        {/* Brand Assets */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 shadow-sm space-y-1">
          <span className="text-[11px] font-condensed uppercase tracking-wider text-blue-700 dark:text-blue-400 block font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Brand &amp; Facility Marks</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl text-blue-900 dark:text-blue-200 font-bold">
              {files.filter((f) => f.isBrand).length}
            </span>
          </div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400/80 block">
            Logos, dining, gardens, lobby
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#201d19] border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-condensed uppercase tracking-wider font-semibold transition-all shrink-0 ${
              filter === "all"
                ? "bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-sm"
                : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            }`}
          >
            All Files ({files.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("orphaned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-condensed uppercase tracking-wider font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              filter === "orphaned"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800/40"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Orphaned Only ({orphanedFiles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("referenced")}
            className={`px-3 py-1.5 rounded-xl text-xs font-condensed uppercase tracking-wider font-semibold transition-all shrink-0 ${
              filter === "referenced"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100"
            }`}
          >
            Referenced Rooms ({files.filter((f) => f.isReferencedInRooms).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("brand")}
            className={`px-3 py-1.5 rounded-xl text-xs font-condensed uppercase tracking-wider font-semibold transition-all shrink-0 ${
              filter === "brand"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100"
            }`}
          >
            Brand &amp; Facility ({files.filter((f) => f.isBrand).length})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search by file or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-medium focus:outline-none focus:border-stone-400"
          />
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-white dark:bg-[#201d19] border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-[#181614] border-b border-stone-200 dark:border-stone-800 font-condensed uppercase tracking-wider text-stone-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Preview &amp; Filename</th>
                <th className="py-3 px-4">Status / Database Reference</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-normal">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-stone-400">
                    No files found matching current filter &amp; search.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isOrphaned = !file.isReferencedInRooms && !file.isBrand;

                  return (
                    <tr
                      key={file.name}
                      className={`hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors ${
                        isOrphaned ? "bg-amber-50/20 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0 border border-stone-200 dark:border-stone-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-stone-900 dark:text-stone-100 truncate max-w-[240px] sm:max-w-xs">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-stone-400">
                              /images/{file.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {file.isReferencedInRooms ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Active in Room Config</span>
                            </span>
                            <p className="text-[11px] text-stone-500 truncate max-w-[200px]">
                              {file.referencedRooms?.join(", ")}
                            </p>
                          </div>
                        ) : file.isBrand ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-medium">
                            <Sparkles className="h-3 w-3 text-blue-600" />
                            <span>Brand / Facility Identity</span>
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              <span>Orphaned File (Unreferenced)</span>
                            </span>
                            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                              Safe to batch rename or assign to room
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-stone-600 dark:text-stone-300">
                        {formatBytes(file.size)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => copyPath(file.name)}
                            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            title="Copy path"
                          >
                            {copiedName === file.name ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenBatchRenameWithFiles([file.name])}
                            className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-condensed uppercase tracking-wider text-[11px] font-medium"
                          >
                            Rename
                          </button>

                          {onDeleteFile && (
                            <button
                              type="button"
                              onClick={() => onDeleteFile(file.name)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title={`Delete ${file.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
