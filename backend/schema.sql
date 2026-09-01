-- ==============================================================================
-- SIH26 Clinical Triage & Referral Infrastructure Schema
-- PostgreSQL / Supabase Schema Definition
-- ==============================================================================

-- Facilities Table
CREATE TABLE IF NOT EXISTS public.facilities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location_lat FLOAT,
    location_lng FLOAT,
    available_services JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients Table (with Unique Aadhaar Number constraint)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aadhaar_number VARCHAR(12) UNIQUE,
    full_name TEXT NOT NULL,
    age INT,
    gender VARCHAR(20),
    phone_number VARCHAR(15),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage Records Table
CREATE TABLE IF NOT EXISTS public.triage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    aadhaar_number VARCHAR(12),
    symptoms_text TEXT NOT NULL,
    ai_urgency_score TEXT NOT NULL,
    clinical_data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'Pending',
    referred_facility_id INT REFERENCES public.facilities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable Clinical Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    staff_id VARCHAR(100) DEFAULT 'ASHA_SAHAYAK_01',
    staff_role VARCHAR(50) DEFAULT 'ASHA_WORKER',
    urgency_level VARCHAR(20),
    delta_changes JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    client_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explicit Indexes for High-Density Command Queue & Instant Retrieval
CREATE INDEX IF NOT EXISTS idx_patients_aadhaar ON public.patients(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_triage_records_aadhaar ON public.triage_records(aadhaar_number);
CREATE INDEX IF NOT EXISTS idx_triage_records_urgency ON public.triage_records(ai_urgency_score);
CREATE INDEX IF NOT EXISTS idx_triage_records_created_at ON public.triage_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_records_priority_created ON public.triage_records(ai_urgency_score, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON public.facilities(type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
