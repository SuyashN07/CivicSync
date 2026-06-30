/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import FeedSidebar from "./components/FeedSidebar";
import RealTimeMap from "./components/RealTimeMap";
import ReportIssue from "./components/ReportIssue";
import AuthorityDashboard from "./components/AuthorityDashboard";
import { Issue, Comment, UserProfile } from "./types";
import { Shield, Sparkles, CheckCircle, Award } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("feed");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    uid: "citizen-hero-1",
    name: "Suyash G.",
    email: "suyashgnaman07@gmail.com",
    role: "citizen",
    trustScore: 120,
    badges: ["Civic Pioneer", "Quick Reporter"],
    createdAt: new Date().toISOString()
  });

  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Sync dark mode class on document
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Load issues and current user profile on boot
  useEffect(() => {
    fetchIssues();
    fetchUserProfile();
  }, []);

  // Synchronize comments whenever an issue is selected
  useEffect(() => {
    if (selectedIssue) {
      fetchComments(selectedIssue.id);
    } else {
      setComments([]);
    }
  }, [selectedIssue]);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch("/api/issues");
      const data = await res.json();
      setIssues(data);
    } catch (e) {
      console.error("Failed to load issues", e);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`/api/users/profile?uid=${currentUser.uid}`);
      const data = await res.json();
      setCurrentUser(data);
    } catch (e) {
      console.error("Failed to load user profile", e);
    }
  };

  const fetchComments = async (issueId: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/comments`);
      const data = await res.json();
      setComments(data);
    } catch (e) {
      console.error("Failed to load comments", e);
    }
  };

  // Upvote issue action
  const handleUpvote = async (id: string) => {
    try {
      const res = await fetch(`/api/issues/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.uid })
      });
      const data = await res.json();
      
      if (data.success) {
        // Update local list
        setIssues(issues.map((i) => (i.id === id ? data.issue : i)));
        // Sync selected issue if open
        if (selectedIssue && selectedIssue.id === id) {
          setSelectedIssue(data.issue);
        }
        showToast("Endorsement logged successfully. Trust metrics synchronized!", "success");
        fetchUserProfile(); // update trust score
      }
    } catch (e) {
      console.error("Upvote failed", e);
    }
  };

  // Add Comment action
  const handleAddComment = async (issueId: string, text: string) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          userId: currentUser.uid,
          userName: currentUser.name,
          userRole: currentUser.role
        })
      });
      const data = await res.json();
      if (data.success) {
        setComments([...comments, data.comment]);
        showToast("Comment successfully published to Community Feed", "info");
      }
    } catch (e) {
      console.error("Add comment failed", e);
    }
  };

  // Submit new reported hazard action (called by ReportIssue)
  const handleReportSubmit = async (reportData: {
    title: string;
    description: string;
    location: { lat: number; lng: number; address: string };
    images: string[];
    aiMetadata: any;
  }) => {
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reportData,
          reporterId: currentUser.uid,
          reporterName: currentUser.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setIssues([data.issue, ...issues]);
        setActiveTab("feed");
        setSelectedIssue(data.issue);
        showToast("Hazard submitted! Routed and scored. You received +15 Trust Points!", "success");
        fetchUserProfile(); // update trust score
      }
    } catch (e) {
      console.error("Failed to submit hazard", e);
    }
  };

  // Resolve and visually audit issue action (called by AuthorityDashboard)
  const handleVerifyFix = async (id: string, afterImage: string) => {
    try {
      const res = await fetch(`/api/issues/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          afterImage,
          userId: currentUser.uid
        })
      });
      const data = await res.json();
      
      if (data.success) {
        // Update local list
        setIssues(issues.map((i) => (i.id === id ? data.issue : i)));
        if (selectedIssue && selectedIssue.id === id) {
          setSelectedIssue(data.issue);
        }
        showToast(`Fix verified with Score ${data.verification.fixValidityScore}/100. Citizens rewarded!`, "success");
        fetchUserProfile(); // update trust score
        return data;
      } else {
        showToast(data.message || "Visual verification failed.", "info");
        return data;
      }
    } catch (e) {
      console.error("Resolve failed", e);
      throw e;
    }
  };

  // Switching between citizen and authority dashboard for ease of evaluation!
  const handleToggleRole = () => {
    const nextRole = currentUser.role === "citizen" ? "authority" : "citizen";
    const nextBadges = nextRole === "authority" 
      ? ["Civic Pioneer", "Municipal Inspector"]
      : ["Civic Pioneer", "Quick Reporter", "Eagle Eye"];

    const updatedUser = {
      ...currentUser,
      role: nextRole,
      badges: nextBadges
    };

    // Update server-side profile sync
    fetch("/api/users/trust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: currentUser.uid,
        points: 0,
        badge: nextRole === "authority" ? "Municipal Inspector" : "Eagle Eye"
      })
    })
      .then((res) => res.json())
      .then((data) => {
        setCurrentUser(data.user);
        showToast(`Swapped view profile to ${nextRole.toUpperCase()} context.`, "info");
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-sleek-grid text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-white/90 dark:bg-zinc-900/80 backdrop-blur-xl border border-emerald-500/30 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xl flex items-start space-x-3 animate-fade-in">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
              System Dispatcher
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5 leading-snug">
              {notification.message}
            </p>
          </div>
        </div>
      )}

      {/* Persistent Navigation Header */}
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onToggleRole={handleToggleRole}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "feed" && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-4rem)]">
            {/* Left aligned dynamic hazard feed feed */}
            <FeedSidebar
              issues={issues}
              selectedIssue={selectedIssue}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
            />
            {/* Interactive Vector Map center stage */}
            <div className="flex-1 h-full">
              <RealTimeMap
                issues={issues}
                selectedIssue={selectedIssue}
                onSelectIssue={(issue) => setSelectedIssue(issue)}
                onUpvote={handleUpvote}
                comments={comments}
                onAddComment={handleAddComment}
                currentUser={currentUser}
              />
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div className="py-8 px-4 overflow-y-auto">
            <ReportIssue
              currentUser={currentUser}
              onSubmitReport={handleReportSubmit}
              onCancel={() => setActiveTab("feed")}
            />
          </div>
        )}

        {activeTab === "authority" && (
          <div className="flex-1 overflow-y-auto">
            <AuthorityDashboard
              issues={issues}
              onVerifyFix={handleVerifyFix}
              currentUser={currentUser}
            />
          </div>
        )}
      </main>

    </div>
  );
}
