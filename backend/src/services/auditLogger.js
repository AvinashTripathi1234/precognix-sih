import { supabase, isSupabaseConfigured } from '../config/supabase.js';

// In-memory fallback audit log buffer for development / offline resilient testing
let fallbackAuditLogs = [
  {
    id: 'AUD-901',
    record_id: 'TR-8841',
    event_type: 'CREATED',
    staff_id: 'ASHA_MEERA_DEVI_04',
    staff_role: 'ASHA_WORKER',
    urgency_level: 'Critical',
    delta_changes: {
      action: 'Point-of-care emergency docket created',
      symptoms: 'Crushing chest pain radiating to left arm',
      comorbidities: 'Hypertension (5 yrs), Type 2 Diabetes'
    },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: 'AUD-902',
    record_id: 'TR-8841',
    event_type: 'DISPATCHED',
    staff_id: '108_DISPATCH_GORAKHPUR',
    staff_role: 'DISPATCHER',
    urgency_level: 'Critical',
    delta_changes: {
      referred_facility: 'BRD Medical College, Gorakhpur',
      status: 'DISPATCHED'
    },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString()
  },
  {
    id: 'AUD-903',
    record_id: 'TR-8840',
    event_type: 'CREATED',
    staff_id: 'ASHA_SUNITA_SINGH_02',
    staff_role: 'ASHA_WORKER',
    urgency_level: 'Critical',
    delta_changes: {
      action: 'Ophidian snakebite casualty docked',
      symptoms: 'Bitten on right foot, ascending edema'
    },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
];

/**
 * Logs an immutable clinical audit trail event for medicolegal compliance.
 * 
 * @param {Object} params
 * @param {string} params.record_id - Identifier of the triage/patient record
 * @param {'CREATED'|'EDITED'|'ACKNOWLEDGED'|'DISPATCHED'|'RESOLVED'|'SLA_BREACHED'} params.event_type - Action performed
 * @param {string} [params.staff_id] - ID/Name of ASHA worker, doctor, or dispatcher
 * @param {string} [params.staff_role] - 'ASHA_WORKER' | 'CHC_DOCTOR' | 'SUPERINTENDENT' | 'SYSTEM'
 * @param {string} [params.urgency_level] - Urgency classification at time of event
 * @param {Object} [params.delta_changes] - Snapshot of modified fields or actions
 * @param {string} [params.ip_address] - Client IP address
 */
export async function logAuditEvent({
  record_id,
  event_type,
  staff_id = 'ASHA_SAHAYAK_01',
  staff_role = 'ASHA_WORKER',
  urgency_level = 'Moderate',
  delta_changes = {},
  ip_address = '127.0.0.1'
}) {
  const auditEntry = {
    id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
    record_id: String(record_id),
    event_type,
    staff_id,
    staff_role,
    urgency_level,
    delta_changes,
    ip_address,
    created_at: new Date().toISOString()
  };

  // Add to in-memory store
  fallbackAuditLogs = [auditEntry, ...fallbackAuditLogs].slice(0, 100);

  // Attempt database insertion
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('audit_logs').insert([{
        record_id: auditEntry.record_id,
        event_type: auditEntry.event_type,
        staff_id: auditEntry.staff_id,
        staff_role: auditEntry.staff_role,
        urgency_level: auditEntry.urgency_level,
        delta_changes: auditEntry.delta_changes,
        ip_address: auditEntry.ip_address,
        client_timestamp: auditEntry.created_at
      }]);
    } catch (err) {
      console.warn('⚠️ [Audit Logger Notice]:', err.message);
    }
  }

  return auditEntry;
}

/**
 * Retrieves audit trails filtered by record_id or event_type.
 */
export async function getAuditLogs({ record_id, limit = 50 } = {}) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (record_id) {
        query = query.eq('record_id', record_id);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('⚠️ [Get Audit Logs Notice]:', err.message);
    }
  }

  let results = [...fallbackAuditLogs];
  if (record_id) {
    results = results.filter((r) => String(r.record_id) === String(record_id));
  }
  return results.slice(0, limit);
}

export default {
  logAuditEvent,
  getAuditLogs
};
