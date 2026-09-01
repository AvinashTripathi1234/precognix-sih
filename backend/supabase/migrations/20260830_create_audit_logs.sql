-- ==============================================================================
-- Migration: Immutable Clinical Audit Logs Table
-- Description: Tracks complete lifecycle events (CREATED, EDITED, ACKNOWLEDGED,
--              DISPATCHED, RESOLVED, SLA_BREACHED) for medicolegal compliance.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'CREATED', 'EDITED', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED', 'SLA_BREACHED'
    staff_id VARCHAR(100) DEFAULT 'ASHA_SAHAYAK_01',
    staff_role VARCHAR(50) DEFAULT 'ASHA_WORKER', -- 'ASHA_WORKER', 'CHC_DOCTOR', 'SUPERINTENDENT', 'SYSTEM'
    urgency_level VARCHAR(20),
    delta_changes JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    client_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by record_id and event_type
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read on audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert on audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
