/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AlertTriangle, MapPin, ThumbsUp, CheckCircle, Clock, Search, ListFilter } from "lucide-react";
import { Issue } from "../types";

interface FeedSidebarProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue) => void;
}

export default function FeedSidebar({ issues, selectedIssue, onSelectIssue }: FeedSidebarProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "resolved">("all");
  const [search, setSearch] = useState("");

  const filtered = issues.filter((issue) => {
    const matchesFilter = filter === "all" || issue.status === filter;
    const matchesSearch =
      search === "" ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase()) ||
      issue.location.address.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            <span>Resolved</span>
          </span>
        );
      case "verified":
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>Verified</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full md:w-80 h-[300px] md:h-full flex-shrink-0 border-r border-slate-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 dark:backdrop-blur-xl flex flex-col overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-200/50 dark:border-zinc-800/50 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-sans text-slate-800 dark:text-white flex items-center">
            <ListFilter className="w-4 h-4 mr-1.5 text-emerald-600" /> Hazard Feed ({filtered.length})
          </h2>
          <div className="flex space-x-1">
            {(["all", "pending", "resolved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`text-[10px] px-2 py-1 rounded-md font-mono font-bold uppercase ${
                  filter === tab
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center bg-slate-100 dark:bg-zinc-800 rounded-xl px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Quick search list..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/40">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-zinc-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No community hazards match your criteria.</p>
          </div>
        ) : (
          filtered.map((issue) => {
            const isSelected = selectedIssue?.id === issue.id;
            return (
              <div
                key={issue.id}
                onClick={() => onSelectIssue(issue)}
                className={`p-3.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-850/30 transition-all ${
                  isSelected ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-l-4 border-emerald-500" : ""
                }`}
              >
                <div className="flex items-start justify-between space-x-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                      {issue.aiMetadata?.category || "Infrastructure"}
                    </span>
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-white line-clamp-1 leading-snug">
                      {issue.title}
                    </h4>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs line-clamp-2">
                      {issue.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 dark:text-zinc-500">
                  <div className="flex items-center space-x-1 font-medium">
                    <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{issue.location.address}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(issue.status)}
                    <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono font-bold">
                      <ThumbsUp className="w-2.5 h-2.5 text-slate-400 mr-0.5" />
                      {issue.upvotes}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
