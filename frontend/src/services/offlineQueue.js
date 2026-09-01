/**
 * Offline-First IndexedDB & LocalStorage Triage Queue Manager
 * Allows ASHA health workers in zero-connectivity rural zones to submit
 * dockets offline with seamless automatic synchronization on network reconnection.
 */

const DB_NAME = 'SIH26_OFFLINE_TRIAGE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_dockets';
const FALLBACK_STORAGE_KEY = 'sih26_offline_pending_dockets';

let dbInstance = null;

// Initialize IndexedDB with graceful fallback
function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'local_queue_id' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.warn('⚠️ [IndexedDB Open Notice]:', e.target.error);
      resolve(null);
    };
  });
}

function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sih26_offline_queue_changed'));
  }
}

/**
 * Enqueues a triage assessment docket for background sync.
 */
export async function enqueueOfflineDocket(payload) {
  const docket = {
    ...payload,
    local_queue_id: `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    enqueued_at: new Date().toISOString(),
    sync_status: 'PENDING_OFFLINE'
  };

  const db = await getDB();

  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(docket);
      await new Promise((resolve) => {
        tx.oncomplete = resolve;
      });
    } catch (err) {
      console.warn('⚠️ [IndexedDB Enqueue Warning]:', err);
      saveToLocalStorageFallback(docket);
    }
  } else {
    saveToLocalStorageFallback(docket);
  }

  notifyQueueChange();
  return docket;
}

function saveToLocalStorageFallback(docket) {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(docket);
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Retrieves all pending offline dockets.
 */
export async function getOfflineQueue() {
  const db = await getDB();

  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      const items = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      return items;
    } catch (err) {
      console.warn('⚠️ [IndexedDB Get Warning]:', err);
    }
  }

  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Removes a docket once synced.
 */
export async function removeOfflineDocket(localQueueId) {
  const db = await getDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(localQueueId);
      await new Promise((res) => {
        tx.oncomplete = res;
      });
    } catch (err) {}
  }

  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw).filter((item) => item.local_queue_id !== localQueueId);
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {}

  notifyQueueChange();
}

/**
 * Synchronizes all pending offline dockets to the backend / Supabase.
 */
export async function syncOfflineQueue(apiBaseUrl = 'http://localhost:5000') {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, pending: (await getOfflineQueue()).length, offline: true };
  }

  const queue = await getOfflineQueue();
  if (queue.length === 0) return { synced: 0, pending: 0 };

  console.log(`📡 [Offline Queue]: Attempting to sync ${queue.length} pending dockets...`);
  let syncedCount = 0;

  for (const item of queue) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: item.symptoms || item.symptoms_text,
          patient_name: item.patient_name,
          patient_age: item.patient_age,
          aadhaar_number: item.aadhaar_number,
          medical_history: item.medical_history,
          vitals: item.vitals,
          gcs: item.gcs
        })
      });

      if (response.ok) {
        await removeOfflineDocket(item.local_queue_id);
        syncedCount++;
        console.log(`✅ [Offline Queue]: Successfully synced docket ${item.local_queue_id}`);
      }
    } catch (err) {
      console.warn(`⚠️ [Offline Queue]: Failed to sync ${item.local_queue_id}, retrying later.`, err.message);
      break; // stop loop if network dropped again
    }
  }

  notifyQueueChange();
  return { synced: syncedCount, pending: (await getOfflineQueue()).length };
}

// Auto-sync listener on browser network restoration
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 [Network Status]: Network connection restored! Initiating background sync...');
    syncOfflineQueue();
  });
}

export default {
  enqueueOfflineDocket,
  getOfflineQueue,
  removeOfflineDocket,
  syncOfflineQueue
};
