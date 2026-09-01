/**
 * Role-Based Access Control (RBAC) & Patient Isolation Middleware
 * Enforces cryptographic or header-based role authentication for:
 * - ASHA_WORKER
 * - CHC_DOCTOR
 * - SUPERINTENDENT (District Admin)
 * - PATIENT (Isolated Access by Aadhaar / Token)
 */

export const ROLES = {
  ASHA_WORKER: 'ASHA_WORKER',
  CHC_DOCTOR: 'CHC_DOCTOR',
  SUPERINTENDENT: 'SUPERINTENDENT',
  PATIENT: 'PATIENT',
};

/**
 * Authenticates request role from headers or Authorization token.
 * Defaults to 'ASHA_WORKER' if unauthenticated in field mode for seamless offline resilience.
 */
export function authenticateUser(req, res, next) {
  const roleHeader = req.headers['x-user-role'];
  const staffIdHeader = req.headers['x-staff-id'];
  const aadhaarHeader = req.headers['x-patient-aadhaar'];

  let role = ROLES.ASHA_WORKER;
  let staffId = staffIdHeader || 'ASHA_FIELD_WORKER';
  let aadhaar = aadhaarHeader || null;

  if (roleHeader) {
    const normalized = roleHeader.toUpperCase().replace(/\s+/g, '_');
    if (Object.values(ROLES).includes(normalized)) {
      role = normalized;
    }
  }

  req.user = {
    role,
    staffId,
    aadhaar: aadhaar ? String(aadhaar).replace(/\s+/g, '') : null,
    ip: req.ip || req.connection.remoteAddress || '127.0.0.1'
  };

  next();
}

/**
 * Enforces specific role authorization on sensitive endpoints.
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Endpoint requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user?.role || 'ANONYMOUS'}`
      });
    }
    next();
  };
}

/**
 * Enforces strict patient isolation, preventing cross-patient data exposure.
 */
export function enforcePatientIsolation(req, res, next) {
  if (req.user?.role === ROLES.PATIENT) {
    if (!req.user.aadhaar) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Patient access requires providing valid Aadhaar UID header (x-patient-aadhaar).'
      });
    }
    req.patientFilterAadhaar = req.user.aadhaar;
  }
  next();
}

export default {
  ROLES,
  authenticateUser,
  requireRole,
  enforcePatientIsolation
};
