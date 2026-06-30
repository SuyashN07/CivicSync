import React from 'react';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

export default function Page() {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-zinc-950 flex-col md:flex-row overflow-hidden">
      {/* Sidebar for reporting and tracking local issues */}
      <div className="w-full md:w-[400px] h-[400px] md:h-full bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 shadow-xl overflow-y-auto z-10 p-6 flex flex-col shrink-0">
        <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-white mb-2">
          CivicSync
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
          Community Hero - Hyperlocal Problem Solver
        </p>
        
        {/* Mock UI for Sidebar */}
        <div className="flex-1 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 animate-pulse h-32"></div>
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 animate-pulse h-48"></div>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="flex-1 h-full w-full relative z-0 bg-[#f4f3f0]">
        <MapComponent 
          issues={[]} 
          selectedIssue={null} 
          onSelectIssue={() => {}} 
          userGPSLocation={null} 
          mapType="street" 
          zoomLevel={13} 
          onZoomChange={() => {}} 
        />
      </div>
    </div>
  );
}
