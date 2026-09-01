import React from 'react';
import { useNetworkHealth } from '../hooks/useNetworkHealth';

export default function BackendConnectionStatus() {
  const { isBackendOnline, isBrowserOnline, isChecking, lastChecked, retryConnection } =
    useNetworkHealth(15000);

  // If backend is online, keep banner hidden
  if (isBackendOnline && isBrowserOnline) {
    return null;
  }

  return (
    <div className="w-full bg-[#CC0000] text-white border-b-4 border-[#111111] font-mono text-xs px-4 py-3 z-50 shadow-none rounded-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-white text-[#CC0000] px-2 py-0.5 font-black uppercase text-[10px] tracking-wider rounded-none">
            COMMUNICATION SEVERED
          </span>
          <span className="font-bold uppercase tracking-wide">
            {!isBrowserOnline
              ? '[ERROR: NETWORK INTERFACE OFFLINE • LOCAL INDEXEDDB RESILIENCE ENGAGED]'
              : '[ERROR: BACKEND SERVER DISCONNECTED • LOCAL OFFLINE RESILIENCE MODE ACTIVE]'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-gray-200 uppercase">
            {lastChecked ? `LAST PROBE: ${lastChecked}` : 'CONNECTING...'}
          </span>
          <button
            type="button"
            onClick={retryConnection}
            disabled={isChecking}
            className="bg-white text-[#111111] hover:bg-gray-200 px-3.5 py-1.5 font-bold uppercase transition-none border-2 border-[#111111] rounded-none cursor-pointer tracking-wider"
          >
            {isChecking ? 'PROBING SERVER...' : '[RETRY CONNECTION]'}
          </button>
        </div>
      </div>
    </div>
  );
}
