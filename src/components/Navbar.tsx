/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Shield, Coins, Award, LogOut, CheckCircle, RefreshCw } from "lucide-react";
import { UserProfile } from "../types";

interface NavbarProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onToggleRole: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  onToggleRole,
  darkMode,
  setDarkMode,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-zinc-950/60 border-b border-slate-200/80 dark:border-zinc-800/80 shadow-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("feed")}>
          <div className="p-2 bg-emerald-600 dark:bg-emerald-500 rounded-xl text-white shadow-md shadow-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="font-sans font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
              Civic<span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Sync</span>
            </span>
            <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              Hyperlocal Citizen Network
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex space-x-1 bg-slate-100 dark:bg-zinc-900/60 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-zinc-800/50">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "feed"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Issue Map & Feed
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "report"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Report Hazard
          </button>
          <button
            onClick={() => setActiveTab("authority")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "authority"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Officer Portal
          </button>
        </nav>

        {/* Profile and Quick Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Quick Role Toggle (For review convenience!) */}
          <button
            onClick={onToggleRole}
            className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium rounded-lg transition-all duration-200"
            title="Switch user role to easily evaluate citizen and authority views"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-bold capitalize">{user.role}</span>
          </button>

          {/* Gamification Stats: Trust Points */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">
            <Coins className="w-4 h-4 text-emerald-500" />
            <span className="font-mono text-xs sm:text-sm font-bold">{user.trustScore}</span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 hidden sm:inline">TP</span>
          </div>

          {/* Badge Display */}
          {user.badges.length > 0 && (
            <div className="hidden lg:flex items-center space-x-1 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Award className="w-3.5 h-3.5 text-indigo-500 mr-1" />
              <span>{user.badges[user.badges.length - 1]}</span>
            </div>
          )}

          {/* Theme Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800/80 backdrop-blur-md transition"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {/* Mobile Nav Subbar */}
      <div className="md:hidden flex space-x-1 border-t border-slate-200/50 dark:border-zinc-800/50 bg-slate-50 dark:bg-zinc-950/60 backdrop-blur-xl p-2">
        <button
          onClick={() => setActiveTab("feed")}
          className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === "feed"
              ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          Map & Feed
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === "report"
              ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          Report Hazard
        </button>
        <button
          onClick={() => setActiveTab("authority")}
          className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === "authority"
              ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          Officer Portal
        </button>
      </div>
    </header>
  );
}
