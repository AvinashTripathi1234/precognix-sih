import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { getOfflineQueue, syncOfflineQueue } from '../services/offlineQueue';
import { getCurrentSession, logout } from '../services/authService';

export default function Navbar() {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => {
    const d = new Date();
    setDateStr(
      d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).toUpperCase()
    );

    const checkAuth = () => {
      const { user } = getCurrentSession();
      setAuthUser(user);
    };
    checkAuth();

    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    const handleOnline = () => {
      setIsOnline(true);
      checkQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };

    const handleQueueChange = () => {
      checkQueue();
    };

    const handleAuthChange = () => {
      checkAuth();
    };

    async function checkQueue() {
      const queue = await getOfflineQueue();
      setQueuedCount(queue.length);
    }

    checkQueue();

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sih26_offline_queue_changed', handleQueueChange);
    window.addEventListener('sih26_auth_changed', handleAuthChange);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sih26_offline_queue_changed', handleQueueChange);
      window.removeEventListener('sih26_auth_changed', handleAuthChange);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      const q = await getOfflineQueue();
      setQueuedCount(q.length);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    setAuthUser(null);
    navigate('/login');
  };

  return (
    <header className="broadsheet-masthead">
      <div className="max-w-7xl mx-auto">
        {/* Masthead Top Metadata Strip */}
        <div className="masthead-meta flex flex-wrap items-center justify-between gap-2">
          <span>VOL. CXXVI NO. 42 • OFFICIAL CLINICAL REGISTRY</span>
          <span>{dateStr || 'DAILY EDITION'}</span>
          
          <div className="flex items-center gap-3">
            {/* Active User Session Indicator */}
            {authUser && (
              <span className="flex items-center gap-1.5 bg-[#111111] text-white px-2 py-0.5 font-mono text-[10px] font-bold">
                <span>
                  {authUser.role}: {authUser.staff_id || authUser.masked_aadhaar || authUser.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="underline uppercase ml-1.5 text-gray-300 hover:text-white"
                >
                  [LOGOUT]
                </button>
              </span>
            )}

            {/* Offline Queue Badge */}
            {queuedCount > 0 && (
              <span className="flex items-center gap-1.5 bg-[#CC0000] text-white px-2 py-0.5 font-mono text-[10px] font-bold">
                <span>⚠ {queuedCount} OFFLINE DOCKET{queuedCount > 1 ? 'S' : ''} QUEUED</span>
                {isOnline && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="underline uppercase ml-1 hover:text-[#EAE8E2]"
                  >
                    {isSyncing ? 'SYNCING...' : '[SYNC NOW]'}
                  </button>
                )}
              </span>
            )}

            {/* Online / Offline Connectivity Telemetry */}
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={`inline-block w-2 h-2 ${
                  isOnline && isConnected ? 'bg-[#111111]' : 'bg-[#CC0000] animate-pulse'
                }`}
              />
              {!isOnline
                ? 'OFFLINE MODE (LOCAL IDB)'
                : isConnected
                ? 'TELEMETRY: LINKED (ONLINE)'
                : 'SERVER CONNECTING...'}
            </span>
          </div>
        </div>

        {/* Masthead Broadsheet Title */}
        <div className="masthead-title-row">
          <h1 className="masthead-title">
            The Clinical Dispatch & Triage Gazette
          </h1>
          <p className="font-serif italic text-xs text-[#555555] mt-1">
            "An Autonomous Algorithmic Intelligence for Rural and Primary Emergency Healthcare Dispatch"
          </p>
        </div>

        {/* Masthead Navigation Tabs (Collapsed Grid Borders) */}
        <nav className="border-t border-b border-[#111111] grid grid-cols-2 md:grid-cols-7 text-center font-sans text-xs font-bold uppercase divide-x divide-[#111111]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `py-2 px-3 transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#F9F9F7]'
                  : 'bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]'
              }`
            }
          >
            EDITORIAL INDEX
          </NavLink>
          <NavLink
            to="/command"
            className={({ isActive }) =>
              `py-2 px-3 transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#F9F9F7]'
                  : 'bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]'
              }`
            }
          >
            COMMAND CONSOLE
          </NavLink>
          <NavLink
            to="/triage"
            className={({ isActive }) =>
              `py-2 px-3 transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#F9F9F7]'
                  : 'bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]'
              }`
            }
          >
            ASHA FIELD DOCKET
          </NavLink>
          <NavLink
            to="/facilities"
            className={({ isActive }) =>
              `py-2 px-3 transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#F9F9F7]'
                  : 'bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]'
              }`
            }
          >
            FACILITY DIRECTORY
          </NavLink>
          <NavLink
            to="/referrals"
            className={({ isActive }) =>
              `py-2 px-3 transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#F9F9F7]'
                  : 'bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]'
              }`
            }
          >
            NEW REFERRAL
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `py-2 px-3 transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#F9F9F7]'
                  : 'bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]'
              }`
            }
          >
            TELEMETRY
          </NavLink>
          <NavLink
            to={authUser?.role === 'PATIENT' ? '/patient-portal' : '/login'}
            className={({ isActive }) =>
              `py-2 px-3 transition-none ${
                isActive
                  ? 'bg-[#111111] text-[#F9F9F7]'
                  : 'bg-transparent text-[#111111] hover:bg-[#111111] hover:text-[#F9F9F7]'
              }`
            }
          >
            {authUser?.role === 'PATIENT' ? 'PATIENT DOSSIER' : 'AUTH GATEWAY'}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
