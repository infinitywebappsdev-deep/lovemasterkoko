"use client";

import React from "react";
import { ArrowUpDown, Clock, ArrowDownAZ, Sparkles } from "lucide-react";

export type RoomSortOption = "recently_updated" | "name_asc" | "custom_order";

interface RoomSortDropdownProps {
  value: RoomSortOption;
  onChange: (val: RoomSortOption) => void;
  className?: string;
}

export function RoomSortDropdown({ value, onChange, className = "" }: RoomSortDropdownProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-xs font-condensed uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1 shrink-0">
        <ArrowUpDown className="h-3.5 w-3.5 text-stone-400" />
        <span>Sort By:</span>
      </span>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as RoomSortOption)}
          className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200 hover:border-stone-400 dark:hover:border-stone-600 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer shadow-sm"
        >
          <option value="recently_updated">Recently Updated</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="custom_order">Custom Order</option>
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
          <ArrowUpDown className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
