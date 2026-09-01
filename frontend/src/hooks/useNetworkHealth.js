import { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/socket';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom React Hook for monitoring browser network and backend server availability.
 * Halts redundant fetch operations when backend is offline and enables manual reconnection.
 */
export function useNetworkHealth(pollIntervalMs = 15000) {
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const checkBackendHealth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsBrowserOnline(false);
      setIsBackendOnline(false);
      return false;
    }

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${API_BASE_URL}/api/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setIsBackendOnline(true);
        setIsBrowserOnline(true);
        // If socket is disconnected, trigger connection
        if (!socket.connected) {
          socket.connect();
        }
        return true;
      } else {
        setIsBackendOnline(false);
        return false;
      }
    } catch (err) {
      setIsBackendOnline(false);
      return false;
    } finally {
      setIsChecking(false);
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, []);

  useEffect(() => {
    // Initial verification
    checkBackendHealth();

    // Polling interval
    const interval = setInterval(checkBackendHealth, pollIntervalMs);

    const handleOnline = () => {
      setIsBrowserOnline(true);
      checkBackendHealth();
    };

    const handleOffline = () => {
      setIsBrowserOnline(false);
      setIsBackendOnline(false);
    };

    const handleSocketStatus = (e) => {
      if (e.detail?.connected) {
        setIsBackendOnline(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sih26_socket_status', handleSocketStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sih26_socket_status', handleSocketStatus);
    };
  }, [checkBackendHealth, pollIntervalMs]);

  return {
    isBrowserOnline,
    isBackendOnline,
    isChecking,
    lastChecked,
    retryConnection: checkBackendHealth
  };
}

export default useNetworkHealth;
