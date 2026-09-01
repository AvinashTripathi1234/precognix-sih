import express from 'express';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

const router = express.Router();

const VALID_TIERS = ['Sub-Centre', 'PHC', 'CHC'];

function requireSupabase(res) {
  if (!isSupabaseConfigured()) {
    res.status(503).json({
      success: false,
      message: 'Supabase is not configured (set SUPABASE_URL & SUPABASE_ANON_KEY in backend/.env)'
    });
    return false;
  }
  return true;
}

// GET /api/facilities — feeds the "Referring to" dropdown
router.get('/facilities', async (req, res, next) => {
  try {
    if (!requireSupabase(res)) return;

    const { data, error } = await supabase
      .from('facilities')
      .select('id, name, type')
      .order('name', { ascending: true });

    if (error) {
      return res.status(502).json({ success: false, message: error.message });
    }

    res.json({ success: true, facilities: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/referrals — most recent first
router.get('/referrals', async (req, res, next) => {
  try {
    if (!requireSupabase(res)) return;

    const { data, error } = await supabase
      .from('referrals_workflow')
      .select(
        'id, created_at, status, reason, from_tier, patients(name, age), facilities!to_facility_id(name, type)'
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(502).json({ success: false, message: error.message });
    }

    res.json({ success: true, referrals: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/referrals — create a patient + referral record
router.post('/referrals', async (req, res, next) => {
  try {
    if (!requireSupabase(res)) return;

    const body = req.body || {};
    const patientName = typeof body.patient_name === 'string' ? body.patient_name.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const fromTier = body.from_tier;
    const toFacilityId = body.to_facility_id;
    const rawAge = body.age;

    // --- Validation ---
    if (!patientName || patientName.length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Patient name is required (max 120 characters).'
      });
    }

    if (!reason || reason.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Reason for referral is required (max 200 characters).'
      });
    }

    if (!VALID_TIERS.includes(fromTier)) {
      return res.status(400).json({
        success: false,
        message: `"Referring from" must be one of: ${VALID_TIERS.join(', ')}.`
      });
    }

    const facilityId = Number(toFacilityId);
    if (!Number.isInteger(facilityId) || facilityId <= 0) {
      return res.status(400).json({
        success: false,
        message: '"Referring to" facility is required.'
      });
    }

    let age = null;
    if (rawAge !== undefined && rawAge !== null && rawAge !== '') {
      age = Number(rawAge);
      if (!Number.isInteger(age) || age < 0 || age > 120) {
        return res.status(400).json({
          success: false,
          message: 'Age must be a whole number between 0 and 120.'
        });
      }
    }

    // Confirm the target facility actually exists.
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('id')
      .eq('id', facilityId)
      .maybeSingle();

    if (facilityError) {
      return res.status(502).json({ success: false, message: facilityError.message });
    }
    if (!facility) {
      return res.status(400).json({ success: false, message: 'Selected facility does not exist.' });
    }

    // --- Insert patient first, then the referral ---
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({ name: patientName, age })
      .select('id, name, age')
      .single();

    if (patientError) {
      return res.status(502).json({ success: false, message: patientError.message });
    }

    const { data: referral, error: referralError } = await supabase
      .from('referrals_workflow')
      .insert({
        patient_id: patient.id,
        to_facility_id: facilityId,
        from_tier: fromTier,
        reason
        // status is intentionally omitted: the column is a Postgres enum
        // (referral_status) whose default value ('Referred') we rely on.
      })
      .select(
        'id, created_at, status, reason, from_tier, patients(name, age), facilities!to_facility_id(name, type)'
      )
      .single();

    if (referralError) {
      // Best-effort cleanup so a failed referral doesn't leave an orphaned patient.
      await supabase.from('patients').delete().eq('id', patient.id);
      return res.status(502).json({ success: false, message: referralError.message });
    }

    res.status(201).json({ success: true, referral });
  } catch (err) {
    next(err);
  }
});

export default router;
