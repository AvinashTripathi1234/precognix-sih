-- Migration: Add indexes on triage_priority/ai_urgency_score and created_at for fast queue retrieval
CREATE INDEX IF NOT EXISTS idx_triage_records_priority_created 
ON public.triage_records(ai_urgency_score, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_triage_records_created_at 
ON public.triage_records(created_at DESC);
