import express from 'express';
import { ROLES } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();

// Mock OTP store for development / demonstration
const activeOtpSessions = new Map();

/**
 * POST /api/auth/send-otp
 * Dispatches a simulated 6-digit OTP to the mobile registered with the patient's Aadhaar.
 */
router.post('/send-otp', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { aadhaar_number } = req.body;

  if (!aadhaar_number) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Aadhaar UID is required to dispatch authentication OTP.'
    });
  }

  const cleanAadhaar = String(aadhaar_number).replace(/\s+/g, '');
  if (cleanAadhaar.length !== 12 || !/^\d{12}$/.test(cleanAadhaar)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid Aadhaar UID format. Must contain exactly 12 numerical digits.'
    });
  }

  // Generate deterministic/secure 6-digit OTP
  const generatedOtp = '849201'; // Standardized demo OTP for testing, or randomized
  const maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(8)}`;
  
  activeOtpSessions.set(cleanAadhaar, {
    otp: generatedOtp,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 mins
  });

  // Log audit trail
  await logAuditEvent({
    record_id: `AADHAAR-${cleanAadhaar.slice(8)}`,
    event_type: 'CREATED',
    staff_id: `PATIENT_${maskedAadhaar}`,
    staff_role: ROLES.PATIENT,
    delta_changes: { action: 'OTP authentication dispatched to linked mobile' },
    ip_address: req.ip || '127.0.0.1'
  });

  return res.status(200).json({
    success: true,
    message: `6-digit OTP dispatched to mobile linked with Aadhaar ${maskedAadhaar}`,
    masked_aadhaar: maskedAadhaar,
    otp_hint: generatedOtp, // Provided for instant demo testing
    expires_in_seconds: 300
  });
});

/**
 * POST /api/auth/verify-otp
 * Validates the 6-digit OTP and generates an authenticated session token for the patient.
 */
router.post('/verify-otp', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { aadhaar_number, otp } = req.body;

  if (!aadhaar_number || !otp) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Both Aadhaar UID and 6-digit OTP are required.'
    });
  }

  const cleanAadhaar = String(aadhaar_number).replace(/\s+/g, '');
  const cleanOtp = String(otp).trim();

  // Accept valid session OTP or universal demo OTP '849201' / '123456'
  const session = activeOtpSessions.get(cleanAadhaar);
  const isValidOtp = (session && session.otp === cleanOtp && Date.now() <= session.expiresAt) ||
    cleanOtp === '849201' || cleanOtp === '123456';

  if (!isValidOtp) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired 6-digit OTP. Please re-check or request a new code.'
    });
  }

  // Clear session after successful verification
  activeOtpSessions.delete(cleanAadhaar);

  const maskedAadhaar = `XXXX-XXXX-${cleanAadhaar.slice(8)}`;
  const sessionToken = `JWT_PATIENT_${Buffer.from(cleanAadhaar).toString('base64')}_${Date.now()}`;

  // Log successful login audit trail
  await logAuditEvent({
    record_id: `AADHAAR-${cleanAadhaar.slice(8)}`,
    event_type: 'ACKNOWLEDGED',
    staff_id: `PATIENT_${maskedAadhaar}`,
    staff_role: ROLES.PATIENT,
    delta_changes: { action: 'Patient Aadhaar-OTP verified successfully' },
    ip_address: req.ip || '127.0.0.1'
  });

  return res.status(200).json({
    success: true,
    message: 'Aadhaar identity verified successfully',
    token: sessionToken,
    role: ROLES.PATIENT,
    user: {
      name: 'Aadhaar Verified Beneficiary',
      aadhaar_number: cleanAadhaar,
      masked_aadhaar: maskedAadhaar,
      role: ROLES.PATIENT
    }
  });
});

/**
 * POST /api/auth/login
 * Staff authentication for ASHA Workers and PHC/CHC Doctors.
 */
router.post('/login', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { username, pin, role = 'ASHA_WORKER', sub_tier } = req.body;

  if (!username || !pin) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Staff ID and security PIN are required.'
    });
  }

  const normalizedRole = role.toUpperCase();
  const staffId = String(username).trim();
  const sessionToken = `JWT_STAFF_${normalizedRole}_${Buffer.from(staffId).toString('base64')}_${Date.now()}`;

  // Log login audit trail
  await logAuditEvent({
    record_id: staffId,
    event_type: 'ACKNOWLEDGED',
    staff_id: staffId,
    staff_role: normalizedRole,
    delta_changes: { action: `Staff authenticated as ${normalizedRole} (${sub_tier || 'GENERAL'})` },
    ip_address: req.ip || '127.0.0.1'
  });

  return res.status(200).json({
    success: true,
    message: `Authenticated as ${staffId}`,
    token: sessionToken,
    role: normalizedRole,
    sub_tier: sub_tier || 'PHC',
    user: {
      staff_id: staffId,
      name: staffId.replace(/_/g, ' '),
      role: normalizedRole,
      sub_tier: sub_tier || 'PHC'
    }
  });
});

export default router;
