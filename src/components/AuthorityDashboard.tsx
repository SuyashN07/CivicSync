/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Briefcase,
  Layers,
  Upload,
  User,
  Zap,
  Info,
  Loader2,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { Issue, UserProfile } from "../types";
import { googleSignIn, getAccessToken, initAuth } from "../lib/firebase";

interface AuthorityDashboardProps {
  issues: Issue[];
  onVerifyFix: (id: string, afterImage: string) => Promise<any>;
  currentUser: UserProfile;
}

export default function AuthorityDashboard({ issues, onVerifyFix, currentUser }: AuthorityDashboardProps) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  
  // Resolution upload state
  const [selectedIssueToResolve, setSelectedIssueToResolve] = useState<Issue | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Docs Export State
  const [isExporting, setIsExporting] = useState(false);
  const [docLink, setDocLink] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
  }, []);

  // Load predictions
  useEffect(() => {
    fetch("/api/predict-failures")
      .then((res) => res.json())
      .then((data) => {
        setPredictions(data);
        setLoadingPredictions(false);
      })
      .catch((err) => {
        console.error("Failed to load predictive analytics", err);
        setLoadingPredictions(false);
      });
  }, []);

  // Filter tasks that need dispatching or verification
  const activeTasks = issues.filter((i) => i.status !== "resolved" && i.status !== "duplicate");
  
  // Sort tasks by AI Severity score (descending) to show task prioritization
  const prioritizedTasks = [...activeTasks].sort((a, b) => {
    const sevA = a.aiMetadata?.severity || 5;
    const sevB = b.aiMetadata?.severity || 5;
    return sevB - sevA;
  });

  const handleAfterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setAfterImage(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerVerification = async () => {
    if (!selectedIssueToResolve || !afterImage) return;

    setVerifying(true);
    try {
      const result = await onVerifyFix(selectedIssueToResolve.id, afterImage);
      setVerificationResult(result);
    } catch (err) {
      console.error("Fix Verification failed", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleCloseVerificationModal = () => {
    setSelectedIssueToResolve(null);
    setAfterImage(null);
    setVerificationResult(null);
  };

  // Quick preset resolution image generator
  const applyPresetFixImage = () => {
    // Elegant repaved road/cleaned spot placeholder
    setAfterImage("https://images.unsplash.com/photo-1473163928189-364b2c4e1135?auto=format&fit=crop&q=80&w=600");
  };

  const generateDocsReport = async () => {
    setIsExporting(true);
    setDocLink(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
          setNeedsAuth(false);
        } else {
          setIsExporting(false);
          return;
        }
      }

      // Create new document
      const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `CivicSync Authority Report - ${new Date().toLocaleDateString()}`
        })
      });

      const doc = await createRes.json();
      if (!doc.documentId) throw new Error("Failed to create document");

      // Generate Report Text
      let reportText = `CivicSync Authority Report\nGenerated on: ${new Date().toLocaleString()}\n\n`;
      reportText += `Total Open Tickets: ${activeTasks.length}\n`;
      reportText += `Resolved This Week: ${issues.filter((i) => i.status === "resolved").length}\n\n`;
      reportText += `--- PRIORITY HAZARDS ---\n\n`;
      
      prioritizedTasks.slice(0, 10).forEach((task) => {
        reportText += `[${task.aiMetadata?.severity}/10] ${task.title}\n`;
        reportText += `Category: ${task.aiMetadata?.category}\n`;
        reportText += `Department: ${task.aiMetadata?.department}\n`;
        reportText += `Address: ${task.location.address}\n\n`;
      });

      // Insert text into document
      await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: reportText
              }
            }
          ]
        })
      });

      setDocLink(`https://docs.google.com/document/d/${doc.documentId}/edit`);
    } catch (err) {
      console.error("Failed to generate docs report", err);
      alert("Failed to generate documentation. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200/50 dark:border-zinc-800/50 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
            Command Center
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">
            Municipal Authority Officer Dashboard
          </h2>
        </div>
        <div className="flex flex-col items-end space-y-2 mt-2 md:mt-0">
          <div className="text-xs text-slate-400 dark:text-zinc-500 font-mono">
            ● Secure Session: Badge #{currentUser.uid.slice(0, 8).toUpperCase()}
          </div>
          <div className="flex items-center space-x-2">
            {docLink ? (
              <a 
                href={docLink} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Open Report in Google Docs
              </a>
            ) : (
              <button 
                onClick={generateDocsReport}
                disabled={isExporting}
                className="flex items-center px-3 py-1.5 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
                {needsAuth ? "Sign in to Generate Docs Report" : "Generate Docs Report"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Key KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white/90 dark:bg-zinc-900/80 dark:backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800 rounded-2xl shadow-lg space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
            Total Open Tickets
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white block font-mono">
            {activeTasks.length}
          </span>
          <span className="text-[10px] text-amber-500 flex items-center font-semibold">
            <Clock className="w-3 h-3 mr-1" /> Pending verification
          </span>
        </div>

        <div className="p-4 bg-white/90 dark:bg-zinc-900/80 dark:backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800 rounded-2xl shadow-lg space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
            Resolved This Week
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 block font-mono">
            {issues.filter((i) => i.status === "resolved").length}
          </span>
          <span className="text-[10px] text-emerald-600 flex items-center font-semibold">
            <CheckCircle className="w-3 h-3 mr-1" /> 100% audited by Gemini
          </span>
        </div>

        <div className="p-4 bg-white/90 dark:bg-zinc-900/80 dark:backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800 rounded-2xl shadow-lg space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
            Average Response Speed
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white block font-mono">
            1.8 Hours
          </span>
          <span className="text-[10px] text-emerald-600 flex items-center font-semibold">
            <Zap className="w-3 h-3 mr-1" /> 74% faster than average
          </span>
        </div>

        <div className="p-4 bg-white/90 dark:bg-zinc-900/80 dark:backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800 rounded-2xl shadow-lg space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
            Deduplicated Duplicate Reports
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white block font-mono">
            14 Reports
          </span>
          <span className="text-[10px] text-indigo-500 flex items-center font-semibold">
            <Shield className="w-3 h-3 mr-1" /> Resources saved: $4.2K
          </span>
        </div>
      </div>

      {/* Main Content Layout Split: Charts & Insights / Task prioritized List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CHARTS & AI FORECASTING */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-4 sm:p-5 bg-white/90 dark:bg-zinc-900/80 dark:backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800 rounded-2xl shadow-lg space-y-4">
            
            {/* Chart Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                  Predictive Analysis Model (Seasonality)
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-600" /> Infrastructure Failure Hazards (6-Month Forecast)
                </h3>
              </div>
              <span className="text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg mt-1 sm:mt-0">
                LSTM AI Model Feed
              </span>
            </div>

            {/* Recharts chart representation */}
            <div className="w-full h-[280px] text-xs">
              {loadingPredictions ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={predictions} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPotholes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLeaks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-zinc-800/40" />
                    <XAxis dataKey="month" stroke="currentColor" className="text-slate-400 dark:text-zinc-600" />
                    <YAxis stroke="currentColor" className="text-slate-400 dark:text-zinc-600" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.9)",
                        border: "none",
                        borderRadius: "10px",
                        color: "#fff",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "10px" }} />
                    <Area type="monotone" dataKey="Potholes" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPotholes)" />
                    <Area type="monotone" dataKey="Water Main Leaks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeaks)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-start space-x-2.5 p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl text-[11px] text-slate-600 dark:text-zinc-400">
              <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-bold text-slate-800 dark:text-white">AI Suggestion:</span> Seasonal pothole risks will peak in winter due to micro-fracture rain damage. Suggest dispatching localized sealing crews to Pine Street and Sutter Area ahead of schedule to prevent road failure.
              </p>
            </div>

          </div>

          {/* AI Automated Task dispatch plans */}
          <div className="p-4 sm:p-5 bg-white/90 dark:bg-zinc-900/80 dark:backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800 rounded-2xl shadow-lg space-y-3">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4.5 h-4.5" />
              <h3 className="text-sm font-bold font-sans text-slate-800 dark:text-white">
                Autonomously Generated Maintenance Plans
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-slate-200/30 flex justify-between items-center text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-white block">Pine St Pothole Paving Plan</span>
                  <span className="text-[10px] text-slate-400">Estimated duration: 3 Hours | Public Works Crew B</span>
                </div>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-mono font-bold uppercase">
                  Ready to Dispatch
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl border border-slate-200/30 flex justify-between items-center text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-white block">Burst Water Valve Repair Team</span>
                  <span className="text-[10px] text-slate-400">Estimated duration: 1.5 Hours | Water Authority Crew A</span>
                </div>
                <span className="px-2 py-1 bg-red-500/10 text-red-700 dark:text-red-400 rounded-lg text-[10px] font-mono font-bold uppercase">
                  Urgent (Water Outage)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PRIORITIZED TASKS & AUDIT TRIGGERS */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-4 sm:p-5 bg-white/90 dark:bg-zinc-900/80 dark:backdrop-blur-xl border border-slate-200/50 dark:border-zinc-800 rounded-2xl shadow-lg space-y-4">
            
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
                AI Automated Priorities
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white">
                Task Prioritization Feed
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                Active tickets sorted by AI Severity level to optimize crew allocation.
              </p>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {prioritizedTasks.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 opacity-60 mb-2" />
                  <p className="text-xs italic">All municipal hazards successfully resolved!</p>
                </div>
              ) : (
                prioritizedTasks.map((task) => {
                  const severity = task.aiMetadata?.severity || 5;
                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100/70 dark:hover:bg-zinc-800 rounded-xl border border-slate-200/40 dark:border-zinc-800/40 space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 bg-slate-200 dark:bg-zinc-700 rounded-md text-slate-600 dark:text-slate-300 mr-2">
                            {task.aiMetadata?.category}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                            #{task.id.slice(0, 5).toUpperCase()}
                          </span>
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white leading-snug mt-1.5">
                            {task.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium block mt-1">
                            Dispatched: {task.aiMetadata?.department}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-lg block">
                            Severity {severity}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/30 dark:border-zinc-800/30">
                        <span className="text-slate-500 dark:text-zinc-400 flex items-center">
                          <User className="w-3.5 h-3.5 mr-1" /> {task.reporterName}
                        </span>
                        
                        <button
                          onClick={() => setSelectedIssueToResolve(task)}
                          className="px-3 py-1 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition"
                        >
                          Verify Resolved
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

      {/* RESOLUTION VERIFICATION MODAL / DIALOG */}
      {selectedIssueToResolve && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50 rounded-2xl p-6 shadow-2xl space-y-4 relative">
            
            <button
              onClick={handleCloseVerificationModal}
              className="absolute top-4 right-4 p-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                Verification Agent Gate
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
                Inspect Resolved Fix
              </h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                Upload an 'after' repair photo. Gemini Vision will compare the before and after photos to score validity before closure.
              </p>
            </div>

            {/* Compare thumbnails */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Original (Before)
                </span>
                <img
                  src={selectedIssueToResolve.images[0]}
                  alt="Before repair"
                  className="w-full aspect-video object-cover rounded-xl border border-slate-200 dark:border-zinc-850"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Completed (After)
                </span>
                {afterImage ? (
                  <div className="relative group">
                    <img
                      src={afterImage}
                      alt="After repair"
                      className="w-full aspect-video object-cover rounded-xl border border-emerald-500"
                    />
                    <button
                      onClick={() => setAfterImage(null)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold rounded-xl transition"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-video border border-dashed border-slate-300 dark:border-zinc-700 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center relative bg-slate-50 dark:bg-zinc-850/50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAfterImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[9px] font-bold text-slate-700 dark:text-zinc-300">Upload Photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Helper Preset for Officers */}
            {!afterImage && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={applyPresetFixImage}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline"
                >
                  Apply High-Quality Preset Repair Photo (For Demo)
                </button>
              </div>
            )}

            {/* Show loading state for verification */}
            {verifying && (
              <div className="p-4 bg-slate-50 dark:bg-zinc-850 rounded-xl flex flex-col items-center justify-center text-center space-y-2 border border-slate-200/50">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">Comparing photos & scoring repair...</span>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                  The Verification Agent is auditing structural integrity, debris removal, and overall fix quality using multimodal vision.
                </p>
              </div>
            )}

            {/* Verification Agent Report Output */}
            {verificationResult && (
              <div className={`p-4 rounded-xl border space-y-3 ${
                verificationResult.success 
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-300"
                  : "bg-red-500/5 border-red-500/30 text-red-950 dark:text-red-300"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" /> Audit Analysis Verified
                  </span>
                  <span className="font-mono font-bold text-xs bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-lg shadow-sm">
                    Score: {verificationResult.verification.fixValidityScore}/100
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  "{verificationResult.verification.description}"
                </p>

                <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg text-[10px] font-bold">
                  <span>Reporter + Solver Trust Points Disbursed!</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-md text-emerald-600">+80 TP</span>
                </div>
              </div>
            )}

            {/* Modal actions */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-zinc-800/40">
              <button
                onClick={handleCloseVerificationModal}
                className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              
              {!verificationResult && afterImage && !verifying && (
                <button
                  onClick={triggerVerification}
                  className="px-5 py-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Verify Repair
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
