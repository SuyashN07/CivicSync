import React, { useEffect, useState, useRef, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Issue } from '../types';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface MapComponentProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onSelectIssue: (issue: Issue | null) => void;
  userGPSLocation: { lat: number; lng: number } | null;
  mapType: "street" | "satellite";
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}

// Inner component to handle map side-effects and clustering
function InnerMap({ issues, selectedIssue, onSelectIssue, userGPSLocation, mapType, zoomLevel }: MapComponentProps) {
  const map = useMap();

  // Sync zoom level
  useEffect(() => {
    if (map && map.getZoom() !== zoomLevel) {
      map.setZoom(zoomLevel);
    }
  }, [zoomLevel, map]);

  // Sync map type
  useEffect(() => {
    if (map) {
      map.setMapTypeId(mapType === "street" ? "roadmap" : "satellite");
    }
  }, [mapType, map]);

  // Center on selected issue
  useEffect(() => {
    if (map && selectedIssue) {
      const { lat, lng } = selectedIssue.location;
      if (typeof lat === 'number' && typeof lng === 'number') {
        map.panTo({ lat, lng });
        map.setZoom(16);
      }
    }
  }, [selectedIssue, map]);

  // Simulated clustering of markers
  const clusteredItems = useMemo(() => {
    const threshold = 0.005; // degree distance to cluster
    const clusters: Array<{
      id: string;
      isCluster: boolean;
      issues: Issue[];
      lat: number;
      lng: number;
    }> = [];

    issues.forEach((issue) => {
      if (typeof issue.location?.lat !== 'number' || typeof issue.location?.lng !== 'number') return;
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
  }, [issues]);

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
    <>
      {clusteredItems.map((cluster) => {
        if (cluster.isCluster) {
          return (
            <AdvancedMarker 
              key={cluster.id} 
              position={{ lat: cluster.lat, lng: cluster.lng }}
              onClick={() => {
                if (map) {
                  map.setZoom(map.getZoom()! + 1);
                  map.panTo({ lat: cluster.lat, lng: cluster.lng });
                }
              }}
            >
              <div className="relative flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-lg text-white font-mono font-bold text-xs">
                  {cluster.issues.length}
                </div>
                <div className="absolute w-12 h-12 rounded-full border border-emerald-500/40 animate-ping opacity-25 pointer-events-none"></div>
              </div>
            </AdvancedMarker>
          );
        } else {
          const issue = cluster.issues[0];
          const isSelected = selectedIssue?.id === issue.id;
          const isResolved = issue.status === "resolved";
          const isVerified = issue.status === "verified";
          
          let colorClass = "bg-rose-500 border-rose-600 shadow-rose-500/30";
          if (isResolved) colorClass = "bg-emerald-500 border-emerald-600 shadow-emerald-500/30";
          if (isVerified) colorClass = "bg-amber-500 border-amber-600 shadow-amber-500/30";
          
          const categoryIcon = getCategoryIcon(issue.aiMetadata?.category);
          const categoryLabel = issue.aiMetadata?.category || "Infrastructure issue";

          return (
            <AdvancedMarker
              key={issue.id}
              position={{ lat: issue.location.lat, lng: issue.location.lng }}
              onClick={() => onSelectIssue(isSelected ? null : issue)}
              zIndex={isSelected ? 1000 : 1}
            >
              <div className={`relative flex flex-col items-center select-none transform transition-all duration-300 cursor-pointer ${
                isSelected ? "scale-110 z-50" : "hover:scale-105"
              }`}>
                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border-2 shadow-lg text-white font-sans ${colorClass}`}>
                  <span className="text-sm leading-none">{categoryIcon}</span>
                  <span className="text-[10px] font-mono font-bold tracking-tight uppercase whitespace-nowrap">{categoryLabel}</span>
                </div>
                <div className={`w-2.5 h-2.5 -mt-[6px] rotate-45 border-r-2 border-b-2 bg-rose-500 border-rose-600 ${
                  isResolved ? "bg-emerald-500 border-emerald-600" : isVerified ? "bg-amber-500 border-amber-600" : ""
                }`}></div>
              </div>
            </AdvancedMarker>
          );
        }
      })}

      {userGPSLocation && (
        <AdvancedMarker position={{ lat: userGPSLocation.lat, lng: userGPSLocation.lng }}>
          <div className="relative flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 shadow-lg z-50"></div>
            <div className="absolute w-10 h-10 rounded-full bg-blue-500/30 animate-ping pointer-events-none"></div>
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}

export default function MapComponent(props: MapComponentProps) {
  if (!hasValidKey) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-slate-200 text-center font-sans">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-zinc-800">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-4 font-sans tracking-tight">Google Maps API Key Required</h2>
          <div className="space-y-4 text-left text-sm text-slate-600 dark:text-zinc-400">
            <p className="flex items-start">
              <span className="font-bold text-slate-900 dark:text-white mr-2">1.</span>
              <span><a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">Get a Google Maps API Key</a> (Enable Maps JavaScript API)</span>
            </p>
            <p className="flex items-start">
              <span className="font-bold text-slate-900 dark:text-white mr-2">2.</span>
              <span>Open <strong>Settings</strong> (⚙️ gear icon, top-right)</span>
            </p>
            <p className="flex items-start">
              <span className="font-bold text-slate-900 dark:text-white mr-2">3.</span>
              <span>Select <strong>Secrets</strong>, type <code>GOOGLE_MAPS_PLATFORM_KEY</code></span>
            </p>
            <p className="flex items-start">
              <span className="font-bold text-slate-900 dark:text-white mr-2">4.</span>
              <span>Paste your key and press Enter. The app will rebuild instantly.</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <Map
        defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
        defaultZoom={13}
        mapId="civic_sync_map"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        disableDefaultUI={true}
        style={{ width: '100%', height: '100%' }}
        onZoomChanged={(e) => props.onZoomChange(e.detail.zoom)}
      >
        <InnerMap {...props} />
      </Map>
    </APIProvider>
  );
}
