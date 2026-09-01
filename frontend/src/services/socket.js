import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let hasLoggedConnectError = false;

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 5000,
  autoConnect: true,
});

socket.on('connect', () => {
  hasLoggedConnectError = false;
  console.log('🔌 [Socket.io]: Connected to triage server at', SOCKET_URL);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sih26_socket_status', { detail: { connected: true } }));
  }
});

socket.on('connect_error', (err) => {
  if (!hasLoggedConnectError) {
    hasLoggedConnectError = true;
    console.warn(`⚠️ [Socket.io]: Backend server at ${SOCKET_URL} is unreachable (${err.message}). Retrying with exponential backoff...`);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sih26_socket_status', { detail: { connected: false, error: err.message } }));
  }
});

socket.on('reconnect_failed', () => {
  console.warn('⚠️ [Socket.io]: Maximum reconnection attempts reached. Operating in offline resilience mode.');
});

socket.on('disconnect', (reason) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sih26_socket_status', { detail: { connected: false, reason } }));
  }
});

export function getSocket() {
  return socket;
}

export function subscribeToTriageUpdates(callback) {
  if (!socket) return () => {};

  const handleUpdate = (data) => callback({ type: 'TRIAGE_UPDATE', data });
  const handleAck = (data) => callback({ type: 'TRIAGE_ACKNOWLEDGED', data });
  const handleAlert = (data) => callback({ type: 'EMERGENCY_ALERT', data });
  const handleBreach = (data) => callback({ type: 'CRITICAL_SLA_BREACH', data });
  const handlePatientUpdated = (data) => callback({ type: 'PATIENT_UPDATED', data });
  const handlePatientDeleted = (data) => callback({ type: 'PATIENT_DELETED', data });

  socket.on('triage_update', handleUpdate);
  socket.on('triage_acknowledged', handleAck);
  socket.on('emergency_alert', handleAlert);
  socket.on('critical_sla_breach', handleBreach);
  socket.on('patient_updated', handlePatientUpdated);
  socket.on('patient_deleted', handlePatientDeleted);

  return () => {
    socket.off('triage_update', handleUpdate);
    socket.off('triage_acknowledged', handleAck);
    socket.off('emergency_alert', handleAlert);
    socket.off('critical_sla_breach', handleBreach);
    socket.off('patient_updated', handlePatientUpdated);
    socket.off('patient_deleted', handlePatientDeleted);
  };
}

export default socket;
