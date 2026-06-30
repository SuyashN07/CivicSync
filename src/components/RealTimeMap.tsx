/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Search,
  Sliders,
  Maximize2,
  Minimize2,
  Layers,
  ThumbsUp,
  MessageSquare,
  AlertTriangle,
  Clock,
  Send,
  Sparkles,
  CheckCircle,
  Eye,
  Camera
} from "lucide-react";
import { Issue, Comment, UserProfile } from "../types";
import L from "leaflet";

interface RealTimeMapProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue | null) => void;
  onUpvote: (id: string) => void;
  comments: Comment[];
  onAddComment: (issueId: string, text: string) => void;
  currentUser: UserProfile;
}

export default function RealTimeMap({
  issues,
  selectedIssue,
  onSelectIssue,
  onUpvote,
  comments,
  onAddComment,
  currentUser,
}: RealTimeMapProps) {
  const [mapType, setMapType] = useState<"street" | "satellite">("street");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [userGPSLocation, setUserGPSLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Map limits
  const baseCenter = { lat: 37.7749, lng: -122.4194 }; // San Francisco

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Filter issues based on category and status
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchCategory =
        selectedCategory === "all" ||
        issue.aiMetadata?.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchStatus = selectedStatus === "all" || issue.status === selectedStatus;
      const matchSearch =
        searchQuery === "" ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.location.address.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCategory && matchStatus && matchSearch;
    });
  }, [issues, selectedCategory, selectedStatus, searchQuery]);

  // Simulated clustering of markers if they are close in lat/lng coordinates
  const clusteredItems = useMemo(() => {
    const threshold = 0.005; // degree distance to cluster
    const clusters: Array<{
      id: string;
      isCluster: boolean;
      issues: Issue[];
      lat: number;
      lng: number;
    }> = [];

    filteredIssues.forEach((issue) => {
      let foundCluster = false;
      for (const cluster of clusters) {
        const dist = Math.hypot(cluster.lat - issue.location.lat, cluster.lng - issue.location.lng);
        if (dist < threshold) {
          cluster.issues.push(issue);
          cluster.isCluster = true;
          cluster.lat = (cluster.lat * (cluster.issues.length - 1) + issue.location.lat) / cluster.issues.length;
          cluster.lng = (cluster.lng * (cluster.issues.length - 1) + issue.location.lng) / cluster.issues.length;
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({
          id: `cluster-${issue.id}`,
          isCluster: false,
          issues: [issue],
          lat: issue.location.lat,
          lng: issue.location.lng,
        });
      }
    });

    return clusters;
  }, [filteredIssues]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create Leaflet map instance
    const map = L.map(containerRef.current, {
      center: [baseCenter.lat, baseCenter.lng],
      zoom: zoomLevel,
      zoomControl: false, // We render our own UI buttons!
      attributionControl: false,
    });

    mapRef.current = map;

    // Create marker group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Initialize Tile Layer
    const tileLayer = L.tileLayer(
      mapType === "street"
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
      }
    ).addTo(map);
    tileLayerRef.current = tileLayer;

    // Update zoomLevel state on zoom events
    map.on("zoomend", () => {
      setZoomLevel(map.getZoom());
    });

    // Handle container resize dynamically to prevent Leaflet white/gray background rendering glitch
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    // Get live geolocation and center the map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("RealTimeMap geolocation fetch success:", latitude, longitude);
          setUserGPSLocation({ lat: latitude, lng: longitude });
          map.setView([latitude, longitude], 14);
        },
        (error) => {
          console.warn("RealTimeMap geolocation fetch failed or denied.", error);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    // Cleanup on unmount
    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync zoom level from external UI state changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.getZoom() !== zoomLevel) {
      mapRef.current.setZoom(zoomLevel);
    }
  }, [zoomLevel]);

  // Handle map type changes (Street vs Satellite)
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const url =
      mapType === "street"
        ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    tileLayerRef.current.setUrl(url);
  }, [mapType]);

  // Smoothly center map on selectedIssue when it changes
  useEffect(() => {
    if (selectedIssue && mapRef.current) {
      mapRef.current.setView([selectedIssue.location.lat, selectedIssue.location.lng], 16, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedIssue]);

  // Dynamically update Leaflet markers based on filtered clusters and selectedIssue
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    clusteredItems.forEach((cluster) => {
      if (cluster.isCluster) {
        // Render cluster marker
        const count = cluster.issues.length;
        const icon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg text-white font-mono font-bold text-xs">
                ${count}
              </div>
              <div class="absolute w-12 h-12 rounded-full border border-emerald-500/40 animate-ping opacity-25"></div>
            </div>
          `,
          className: "custom-div-icon",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([cluster.lat, cluster.lng], { icon });
        marker.on("click", () => {
          if (mapRef.current) {
            mapRef.current.setView([cluster.lat, cluster.lng], Math.min(mapRef.current.getZoom() + 1, 18));
          }
        });
        marker.addTo(markersLayerRef.current!);
      } else {
        // Render single marker
        const issue = cluster.issues[0];
        const isSelected = selectedIssue?.id === issue.id;

        const isPending = issue.status === "pending";
        const isResolved = issue.status === "resolved";
        const isVerified = issue.status === "verified";
        
        let colorClass = "bg-rose-500 border-rose-600 shadow-rose-500/30";
        if (isResolved) colorClass = "bg-emerald-500 border-emerald-600 shadow-emerald-500/30";
        if (isVerified) colorClass = "bg-amber-500 border-amber-600 shadow-amber-500/30";
        
        const categoryIcon = getCategoryIcon(issue.aiMetadata?.category);
        const categoryLabel = issue.aiMetadata?.category || "Infrastructure issue";

        const html = `
          <div class="relative flex flex-col items-center select-none transform transition-all duration-300 ${
            isSelected ? "scale-110 z-50" : "hover:scale-105"
          }">
            <div class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border-2 shadow-lg text-white font-sans ${colorClass}">
              <span class="text-sm leading-none">${categoryIcon}</span>
              <span class="text-[10px] font-mono font-bold tracking-tight uppercase whitespace-nowrap">${categoryLabel}</span>
            </div>
            <!-- Pin tail -->
            <div class="w-2.5 h-2.5 -mt-[6px] rotate-45 border-r-2 border-b-2 bg-rose-500 border-rose-600 ${
              isResolved ? "bg-emerald-500 border-emerald-600" : isVerified ? "bg-amber-500 border-amber-600" : ""
            }"></div>
          </div>
        `;

        const icon = L.divIcon({
          html,
          className: "custom-div-icon",
          iconSize: [120, 44],
          iconAnchor: [60, 40],
        });

        const marker = L.marker([issue.location.lat, issue.location.lng], { icon });
        marker.on("click", () => {
          onSelectIssue(isSelected ? null : issue);
        });
        marker.addTo(markersLayerRef.current!);
      }
    });

    // Add high-contrast pulsing user GPS dot representing 'You are here'
    if (userGPSLocation) {
      const userIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-4.5 h-4.5 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 shadow-lg z-50"></div>
            <div class="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping pointer-events-none"></div>
          </div>
        `,
        className: "custom-div-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const userMarker = L.marker([userGPSLocation.lat, userGPSLocation.lng], { icon: userIcon });
      userMarker.addTo(markersLayerRef.current);
    }
  }, [clusteredItems, selectedIssue, userGPSLocation]);

  // Comment submission
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedIssue) return;

    setIsSubmittingComment(true);
    // Simulate real database comment delay
    setTimeout(() => {
      onAddComment(selectedIssue.id, newCommentText.trim());
      setNewCommentText("");
      setIsSubmittingComment(false);
    }, 400);
  };

  // Selected issue's comments
  const activeComments = useMemo(() => {
    if (!selectedIssue) return [];
    return comments.filter((c) => c.issueId === selectedIssue.id);
  }, [comments, selectedIssue]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-emerald-500 border-emerald-600 shadow-emerald-500/30 text-white";
      case "verified":
        return "bg-amber-500 border-amber-600 shadow-amber-500/30 text-white";
      case "duplicate":
        return "bg-slate-400 border-slate-500 shadow-slate-400/30 text-white";
      default: // pending
        return "bg-rose-500 border-rose-600 shadow-rose-500/30 text-white";
    }
  };

  const getCategoryIcon = (category?: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("pothole")) return "🕳️";
    if (cat.includes("garbage") || cat.includes("trash")) return "🗑️";
    if (cat.includes("water") || cat.includes("leak")) return "💧";
    if (cat.includes("light")) return "💡";
    if (cat.includes("traffic")) return "🚦";
    if (cat.includes("sign")) return "🛑";
    return "⚠️";
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row relative bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      
      {/* MAP STAGE CONTAINER */}
      <div
        ref={containerRef}
        className="flex-1 h-[400px] md:h-full relative overflow-hidden select-none transition-all duration-300 z-0 bg-[#f4f3f0]"
        id="map-container"
      >
        {/* MAP OVERLAYS & SEARCH BAR (GLASSMORPHIC) */}
        <div className="absolute top-4 left-4 right-4 md:right-auto md:w-96 z-20 flex flex-col space-y-2 pointer-events-none">
          <div className="w-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/50 rounded-xl shadow-lg p-2.5 flex items-center space-x-2 pointer-events-auto map-control">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search community hazards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-800 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-zinc-500 font-sans"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 text-xs px-1">
                Clear
              </button>
            )}
          </div>

          {/* Quick Filters Group */}
          <div className="w-full bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md border border-slate-200/30 dark:border-zinc-800/30 rounded-xl shadow-md p-2.5 flex flex-wrap gap-1 pointer-events-auto map-control">
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-full mb-1.5 flex items-center">
              <Sliders className="w-3 h-3 mr-1" /> Filters
            </span>
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-[11px] bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 border-0 rounded-lg focus:outline-none font-medium"
            >
              <option value="all">All Categories</option>
              <option value="Pothole">🕳️ Potholes</option>
              <option value="Garbage">🗑️ Garbage</option>
              <option value="Water Leak">💧 Leakages</option>
              <option value="Traffic Light">🚦 Signals</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-[11px] bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 border-0 rounded-lg focus:outline-none font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">⏳ Pending</option>
              <option value="verified">✅ Verified</option>
              <option value="resolved">🟢 Resolved</option>
            </select>
          </div>
        </div>

        {/* FLOATING ACTION LAYER MAP BUTTONS (RIGHT-BOTTOM) */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-2 map-control">
          {/* Zoom In */}
          <button
            onClick={() => setZoomLevel(Math.min(zoomLevel + 1, 18))}
            className="w-10 h-10 flex items-center justify-center bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl shadow-md transition font-bold"
          >
            +
          </button>
          {/* Zoom Out */}
          <button
            onClick={() => setZoomLevel(Math.max(zoomLevel - 1, 10))}
            className="w-10 h-10 flex items-center justify-center bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl shadow-md transition font-bold"
          >
            -
          </button>
          {/* Layer switcher */}
          <button
            onClick={() => setMapType(mapType === "street" ? "satellite" : "street")}
            title="Toggle Map Overlay"
            className="w-10 h-10 flex items-center justify-center bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-slate-200/50 dark:border-zinc-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl shadow-md transition"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SWIPEABLE/COLLAPSIBLE SIDEBAR FOR DETAILED VIEWS */}
      <AnimatePresence>
        {selectedIssue && (
          <motion.div
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="w-full md:w-[450px] h-[500px] md:h-full bg-white/90 dark:bg-zinc-950/70 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-zinc-800/60 shadow-2xl overflow-y-auto flex flex-col z-30 absolute md:relative bottom-0 right-0 md:top-0"
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-slate-200/50 dark:border-zinc-800/50 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-sm z-10">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{getCategoryIcon(selectedIssue.aiMetadata?.category)}</span>
                <div>
                  <span className="text-xs font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase leading-none block">
                    {selectedIssue.aiMetadata?.category || "Infrastructure issue"}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    ID: #{selectedIssue.id.toUpperCase().slice(0, 8)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onSelectIssue(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-slate-300"
              >
                ✕
              </button>
            </div>

            {/* Sidebar main body */}
            <div className="p-4 flex-1 space-y-4">
              {/* Image Preview with overlay status tag */}
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 dark:bg-zinc-950 border border-slate-200/40 dark:border-zinc-800/40">
                <img
                  src={selectedIssue.images[0]}
                  alt={selectedIssue.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual Fix compare module if resolved */}
                {selectedIssue.status === "resolved" && selectedIssue.aiMetadata?.afterImage && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                    <span className="text-[10px] font-mono text-emerald-400 font-extrabold tracking-widest flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" /> AUDITED RESOLUTION ATTACHED
                    </span>
                    <p className="text-[11px] text-zinc-300 line-clamp-2">
                      Compare of before vs after visually audited with score {selectedIssue.aiMetadata.verificationScore}/100.
                    </p>
                  </div>
                )}

                <div className="absolute top-3 left-3 flex space-x-1">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${
                      selectedIssue.status === "resolved"
                        ? "bg-emerald-600 shadow-emerald-600/30"
                        : selectedIssue.status === "verified"
                        ? "bg-amber-500 shadow-amber-500/30"
                        : "bg-rose-500 shadow-rose-500/30"
                    }`}
                  >
                    {selectedIssue.status}
                  </span>
                  
                  {selectedIssue.aiMetadata?.severity && (
                    <span className="px-2.5 py-1 bg-red-600 text-white rounded-full text-[10px] font-bold shadow-md">
                      Severity: {selectedIssue.aiMetadata.severity}/10
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="font-sans font-extrabold text-slate-900 dark:text-white text-base sm:text-lg leading-snug">
                  {selectedIssue.title}
                </h3>
                <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-500 text-xs mt-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                  <span className="truncate">{selectedIssue.location.address}</span>
                </div>
                <p className="text-slate-600 dark:text-zinc-300 text-xs sm:text-sm mt-3 leading-relaxed">
                  {selectedIssue.description}
                </p>
              </div>

              {/* Gamified Community Upvote Module */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50 rounded-xl">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 block uppercase font-bold">
                    COMMUNITY TRUST
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedIssue.upvotes} Citizens Endorsed
                  </span>
                </div>
                <button
                  onClick={() => onUpvote(selectedIssue.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                    selectedIssue.upvotedBy.includes(currentUser.uid)
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>
                    {selectedIssue.upvotedBy.includes(currentUser.uid) ? "Endorsed!" : "Endorse Hazard"}
                  </span>
                </button>
              </div>

              {/* Gemini AI Summary Segment */}
              {selectedIssue.aiMetadata && (
                <div className="relative overflow-hidden p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl space-y-2">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Sparkles className="w-16 h-16 text-emerald-500" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Gemini Agentic Summary
                    </span>
                  </div>
                  
                  <div className="text-[11px] text-slate-700 dark:text-zinc-300 font-sans space-y-1 z-10 relative">
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500">Auto-Assigned Dept:</span>{" "}
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {selectedIssue.aiMetadata.department}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-zinc-500">Triage Confidence:</span>{" "}
                      <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                        {(selectedIssue.aiMetadata.AI_confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    {selectedIssue.aiMetadata.verificationScore && (
                      <div>
                        <span className="text-slate-400 dark:text-zinc-500">Fix Integrity Verification Score:</span>{" "}
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {selectedIssue.aiMetadata.verificationScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Comments/Logs Section */}
              <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-zinc-800/50">
                <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 block uppercase tracking-widest">
                  Discussion & System Audit Logs ({activeComments.length})
                </span>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeComments.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 italic text-center py-2">
                      No discussions yet. Add your comment below!
                    </p>
                  ) : (
                    activeComments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                          comment.isAiSummary
                            ? "bg-purple-500/5 border-purple-500/20 text-purple-900 dark:text-purple-300"
                            : comment.userRole === "authority"
                            ? "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-300"
                            : "bg-slate-50 dark:bg-zinc-850 border-slate-200/50 dark:border-zinc-800/50 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold flex items-center">
                            {comment.isAiSummary && <Sparkles className="w-3 h-3 mr-1 text-purple-500" />}
                            {comment.userName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p>{comment.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Submit Comment Form */}
                <form onSubmit={handleSubmitComment} className="flex space-x-1.5 pt-1">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Ask a question or endorse repair..."
                    disabled={isSubmittingComment}
                    className="flex-1 bg-slate-100 dark:bg-zinc-800 border-none text-slate-800 dark:text-white text-xs px-3 py-2 rounded-xl focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newCommentText.trim()}
                    className="p-2 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
