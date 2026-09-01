-- ==============================================================================
-- Migration: Add Aadhaar Card Number column for Unique Patient Identification
-- Description: Adds aadhaar_number VARCHAR(12) UNIQUE to patients & triage_records
-- ==============================================================================

-- 1. Create patients table if not already created
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

-- 2. Add aadhaar_number column if patients table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patients' 
        AND column_name = 'aadhaar_number'
    ) THEN
        ALTER TABLE public.patients ADD COLUMN aadhaar_number VARCHAR(12) UNIQUE;
    END IF;
END $$;

-- 3. Add aadhaar_number to triage_records table for fast lookup & audit
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'triage_records' 
        AND column_name = 'aadhaar_number'
    ) THEN
        ALTER TABLE public.triage_records ADD COLUMN aadhaar_number VARCHAR(12);
        CREATE INDEX IF NOT EXISTS idx_triage_records_aadhaar ON public.triage_records(aadhaar_number);
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS) policies
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_records ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous/authenticated read & insert for health workers
CREATE POLICY "Allow public read on patients" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert on patients" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on patients" ON public.patients FOR UPDATE USING (true);

CREATE POLICY "Allow public read on triage_records" ON public.triage_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert on triage_records" ON public.triage_records FOR INSERT WITH CHECK (true);
