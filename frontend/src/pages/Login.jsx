import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  sendPatientOtp,
  verifyPatientOtp,
  loginStaff,
  getCurrentSession,
  setCurrentSession
} from '../services/authService';

// Mock Session Profiles for Instant Development Bypass
const DEV_MOCK_PROFILES = {
  ASHA: {
    role: 'ASHA_WORKER',
    staff_id: 'DEV_ASHA_MEERA_04',
    name: 'Meera Devi (ASHA Sangini)',
    village: 'Rampur Primary Cluster'
  },
  PHC_DOCTOR: {
    role: 'PHC_DOCTOR',
    staff_id: 'DEV_DR_PRIYA_PHC',
    name: 'Dr. Priya Sharma',
    sub_tier: 'PHC',
    jurisdiction: 'Primary Health Centre (PHC)'
  },
  CHC_DOCTOR: {
    role: 'CHC_DOCTOR',
    staff_id: 'DEV_DR_ANAND_CHC',
    name: 'Dr. Anand Verma',
    sub_tier: 'CHC',
    jurisdiction: 'Community Health Centre (CHC)'
  },
  PATIENT: {
    role: 'PATIENT',
    name: 'Ramesh Kumar',
    aadhaar_number: '548291038471',
    masked_aadhaar: 'XXXX-XXXX-8471',
    age: '52 yrs, Male'
  }
};

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  // Active Role Tab: 'ASHA' | 'DOCTOR' | 'PATIENT'
  const [selectedRole, setSelectedRole] = useState('ASHA');

  // Doctor Sub-Tier: 'PHC' | 'CHC' | 'DISTRICT'
  const [doctorTier, setDoctorTier] = useState('CHC');

  // Staff Credentials State
  const [staffId, setStaffId] = useState('ASHA_MEERA_04');
  const [securityPin, setSecurityPin] = useState('1234');

  // Patient Aadhaar-OTP State
  const [aadhaarInput, setAadhaarInput] = useState('5482 9103 8471');
  const [otpStep, setOtpStep] = useState(1); // 1 = Enter Aadhaar, 2 = Enter OTP
  const [otpInput, setOtpInput] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [isOtpActive, setIsOtpActive] = useState(false);
  const [otpNotice, setOtpNotice] = useState(null);

  // Status & Error Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Check if user already logged in
  useEffect(() => {
    const { user } = getCurrentSession();
    if (user) {
      if (onLoginSuccess) {
        onLoginSuccess(user);
      } else {
        if (user.role === 'PATIENT') {
          navigate('/patient-portal');
        } else if (user.role === 'ASHA_WORKER') {
          navigate('/triage');
        } else if (user.role === 'CHC_DOCTOR' || user.role === 'DOCTOR' || user.role === 'PHC_DOCTOR') {
          navigate('/command');
        }
      }
    }
  }, [navigate, onLoginSuccess]);

  // Timer countdown for OTP resend
  useEffect(() => {
    let timer = null;
    if (isOtpActive && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOtpActive, otpCountdown]);

  // Update default staff ID when role changes
  const handleTabChange = (role) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (role === 'ASHA') {
      setStaffId('ASHA_MEERA_04');
      setSecurityPin('1234');
    } else if (role === 'DOCTOR') {
      setStaffId(doctorTier === 'PHC' ? 'DR_PRIYA_SHARMA_PHC' : 'DR_ANAND_VERMA_CHC');
      setSecurityPin('1234');
    }
  };

  const handleDoctorTierChange = (tier) => {
    setDoctorTier(tier);
    setStaffId(tier === 'PHC' ? 'DR_PRIYA_SHARMA_PHC' : 'DR_ANAND_VERMA_CHC');
  };

  // Format Aadhaar Input with Auto-Spacing
  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarInput(raw.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const cleanAadhaar = aadhaarInput.replace(/\s+/g, '');
    if (cleanAadhaar.length !== 12) {
      setErrorMessage('Please enter a valid 12-digit Aadhaar UID number.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await sendPatientOtp(cleanAadhaar);
      setOtpNotice(res);
      setOtpStep(2);
      setIsOtpActive(true);
      setOtpCountdown(60);
      setOtpInput(res.otp_hint || '849201'); // Auto-fill hint for quick testing
      setSuccessMessage(`OTP dispatched to mobile linked with Aadhaar ${res.masked_aadhaar || 'XXXX-XXXX-8471'}`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setErrorMessage('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const cleanAadhaar = aadhaarInput.replace(/\s+/g, '');
      const res = await verifyPatientOtp(cleanAadhaar, otpInput.trim());
      setSuccessMessage('Aadhaar identity verified! Initializing patient terminal...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          navigate('/patient-portal');
        }
      }, 400);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired OTP. Try 849201 for instant demo.');
    } finally {
      setLoading(false);
    }
  };

  // Staff Login Handler (ASHA & Doctors)
  const handleStaffLogin = async (e) => {
    e?.preventDefault();
    if (!staffId.trim() || !securityPin.trim()) {
      setErrorMessage('Please provide both Staff ID and Security PIN.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const roleName = selectedRole === 'DOCTOR' ? (doctorTier === 'PHC' ? 'PHC_DOCTOR' : 'CHC_DOCTOR') : 'ASHA_WORKER';
      const res = await loginStaff({
        username: staffId.trim(),
        pin: securityPin.trim(),
        role: roleName,
        subTier: doctorTier
      });

      setSuccessMessage(`Authenticated as ${staffId}! Entering clinical workspace...`);
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(res.user);
        } else {
          if (selectedRole === 'DOCTOR') {
            navigate('/command');
          } else {
            navigate('/triage');
          }
        }
      }, 400);
    } catch (err) {
      setErrorMessage(err.message || 'Staff authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Instant One-Click Environment-Gated Development Bypass
  const handleDevBypass = (profileKey) => {
    const mockUser = DEV_MOCK_PROFILES[profileKey];
    if (!mockUser) return;
    const mockToken = `DEV_MOCK_JWT_${profileKey}_${Date.now()}`;
    
    // Save to localStorage to prevent logout on page refresh
    setCurrentSession(mockUser, mockToken);

    if (onLoginSuccess) {
      onLoginSuccess(mockUser);
    } else {
      if (mockUser.role === 'PATIENT') {
        navigate('/patient-portal');
      } else if (mockUser.role === 'ASHA_WORKER') {
        navigate('/triage');
      } else {
        navigate('/command');
      }
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-8 font-serif text-[#111111] dark:text-[#f5f2eb] bg-[#f5f2eb] dark:bg-[#121212] relative pb-20">
      <div className="max-w-xl w-full border-4 border-[#111111] dark:border-white bg-[#F9F9F7] dark:bg-[#181818] p-6 sm:p-10 shadow-none space-y-6 rounded-none">
        
        {/* Broadsheet Eyebrow & Masthead Header */}
        <div className="border-b-2 border-[#111111] dark:border-white pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#555555] dark:text-[#aaaaaa]">
              GOVERNMENT OF INDIA • NATIONAL HEALTH AUTHORITY
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-[#111111] dark:text-white mt-0.5">
              Clinical Access Terminal
            </h2>
          </div>
          <span className="font-mono text-[10px] bg-[#111111] dark:bg-white text-white dark:text-[#111111] px-2 py-0.5 font-bold uppercase self-start sm:self-auto">
            ABDM / GATEWAY 2.0
          </span>
        </div>

        {/* Role-Based Tab Selector (ASHA / DOCTOR / PATIENT) */}
        <div className="space-y-1.5 font-mono">
          <label className="block text-[11px] font-bold uppercase text-[#555555] dark:text-[#aaaaaa]">
            SELECT OPERATIONAL ROLE:
          </label>
          <div className="grid grid-cols-3 border-2 border-[#111111] dark:border-white divide-x-2 divide-[#111111] dark:divide-white text-center text-xs font-bold uppercase">
            {['ASHA', 'DOCTOR', 'PATIENT'].map((role) => {
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleTabChange(role)}
                  className={`py-3 px-2 transition-none cursor-pointer ${
                    isActive
                      ? 'bg-[#111111] dark:bg-white text-white dark:text-[#111111]'
                      : 'bg-[#F9F9F7] dark:bg-[#181818] text-[#111111] dark:text-[#f5f2eb] hover:bg-[#EAE8E2] dark:hover:bg-[#252525]'
                  }`}
                >
                  [{role}]
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {errorMessage && (
          <div className="border-2 border-[#CC0000] bg-[#FFF5F5] dark:bg-[#330000] p-3 text-xs font-mono text-[#CC0000] dark:text-[#ff9999] rounded-none">
            <strong>AUTHENTICATION ERROR:</strong> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="border-2 border-[#111111] dark:border-white bg-[#EAE8E2] dark:bg-[#282828] p-3 text-xs font-mono text-[#111111] dark:text-white rounded-none">
            ✓ {successMessage}
          </div>
        )}

        {/* ==================================================================== */}
        {/* DOCTOR AUTHENTICATION VIEW */}
        {/* ==================================================================== */}
        {selectedRole === 'DOCTOR' && (
          <form onSubmit={handleStaffLogin} className="space-y-4 font-mono">
            {/* Secondary Doctor Sub-Tier Dropdown */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                INSTITUTIONAL TIER / JURISDICTION *
              </label>
              <select
                value={doctorTier}
                onChange={(e) => handleDoctorTierChange(e.target.value)}
                className="w-full text-xs bg-white dark:bg-[#222222] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-white p-2.5 rounded-none font-bold"
              >
                <option value="PHC">PRIMARY HEALTH CENTRE (PHC MEDICAL OFFICER)</option>
                <option value="CHC">COMMUNITY HEALTH CENTRE (CHC EMERGENCY DUTY DOCTOR)</option>
                <option value="DISTRICT">DISTRICT HOSPITAL / TERTIARY TRAUMA SURGEON</option>
              </select>
            </div>

            {/* Doctor Staff ID */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                DOCTOR MEDICAL COUNCIL ID / USERNAME *
              </label>
              <input
                type="text"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. DR_ANAND_VERMA_CHC"
                className="w-full text-xs font-mono bg-white dark:bg-[#222222] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-white p-2.5 rounded-none"
              />
            </div>

            {/* Security PIN */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                SECURITY ACCESS PIN *
              </label>
              <input
                type="password"
                required
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                placeholder="••••"
                className="w-full text-xs font-mono bg-white dark:bg-[#222222] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-white p-2.5 rounded-none"
              />
            </div>

            {/* Quick Demo Pre-fill Chips */}
            <div className="text-[10px] text-[#666666] dark:text-[#aaaaaa] flex items-center justify-between pt-1">
              <span>DEMO CREDENTIALS:</span>
              <button
                type="button"
                onClick={() => {
                  setStaffId('DR_ANAND_VERMA_CHC');
                  setSecurityPin('1234');
                }}
                className="underline hover:text-black dark:hover:text-white cursor-pointer uppercase font-bold"
              >
                [AUTOFILL CHC DOCTOR]
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs font-bold uppercase rounded-none tracking-wider bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#333333] dark:hover:bg-[#e0e0e0]"
            >
              {loading ? 'AUTHENTICATING PRACTITIONER...' : 'ENTER MEDICAL COMMAND CONSOLE →'}
            </button>
          </form>
        )}

        {/* ==================================================================== */}
        {/* ASHA WORKER AUTHENTICATION VIEW */}
        {/* ==================================================================== */}
        {selectedRole === 'ASHA' && (
          <form onSubmit={handleStaffLogin} className="space-y-4 font-mono">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                ASHA SANGINI / SWASTHYA SAHAYAK ID *
              </label>
              <input
                type="text"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. ASHA_MEERA_04"
                className="w-full text-xs font-mono bg-white dark:bg-[#222222] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-white p-2.5 rounded-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                SECURITY ACCESS PIN *
              </label>
              <input
                type="password"
                required
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                placeholder="••••"
                className="w-full text-xs font-mono bg-white dark:bg-[#222222] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-white p-2.5 rounded-none"
              />
            </div>

            <div className="text-[10px] text-[#666666] dark:text-[#aaaaaa] flex items-center justify-between pt-1">
              <span>FIELD WORKER ID:</span>
              <button
                type="button"
                onClick={() => {
                  setStaffId('ASHA_MEERA_04');
                  setSecurityPin('1234');
                }}
                className="underline hover:text-black dark:hover:text-white cursor-pointer uppercase font-bold"
              >
                [AUTOFILL ASHA MEERA]
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs font-bold uppercase rounded-none tracking-wider bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#333333] dark:hover:bg-[#e0e0e0]"
            >
              {loading ? 'AUTHENTICATING FIELD WORKER...' : 'ENTER ASHA FIELD INTAKE DOCKET →'}
            </button>
          </form>
        )}

        {/* ==================================================================== */}
        {/* PATIENT AADHAAR & OTP AUTHENTICATION VIEW */}
        {/* ==================================================================== */}
        {selectedRole === 'PATIENT' && (
          <div className="space-y-4 font-mono">
            {otpStep === 1 ? (
              /* STEP 1: Enter Aadhaar Number */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc]">
                      ENTER 12-DIGIT AADHAAR / GOVERNMENT ID *
                    </label>
                    <span className="text-[10px] text-[#777777] dark:text-[#999999]">
                      {aadhaarInput.replace(/\s+/g, '').length} / 12 DIGITS
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={aadhaarInput}
                    onChange={handleAadhaarChange}
                    placeholder="XXXX XXXX XXXX"
                    className="w-full text-sm font-mono text-center tracking-widest bg-white dark:bg-[#222222] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-white p-3 rounded-none font-bold"
                  />
                </div>

                <div className="p-3 bg-[#EAE8E2] dark:bg-[#222222] border border-[#CCCCCC] dark:border-[#333333] text-[11px] space-y-1">
                  <div className="font-bold text-[#111111] dark:text-white uppercase">
                    🔒 PRIVACY & PATIENT DATA ISOLATION:
                  </div>
                  <p className="text-[#555555] dark:text-[#aaaaaa] font-serif text-xs">
                    Your authenticated session strictly isolates access to your individual clinical triage records, emergency referrals, and vital logs.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || aadhaarInput.replace(/\s+/g, '').length !== 12}
                  className="btn-primary w-full py-3.5 text-xs font-bold uppercase rounded-none tracking-wider bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#333333] dark:hover:bg-[#e0e0e0]"
                >
                  {loading ? 'DISPATCHING OTP TO MOBILE...' : '⚡ SEND OTP TO LINKED MOBILE'}
                </button>
              </form>
            ) : (
              /* STEP 2: Enter 6-Digit OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="border border-[#111111] dark:border-white p-3 bg-[#EAE8E2] dark:bg-[#222222] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#777777] uppercase text-[10px] block">VERIFYING IDENTIFIER:</span>
                    <span className="font-bold">AADHAAR {aadhaarInput}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(1);
                      setOtpInput('');
                    }}
                    className="underline text-[10px] font-bold uppercase text-[#111111] dark:text-white hover:opacity-80"
                  >
                    [CHANGE UID]
                  </button>
                </div>

                {otpNotice?.otp_hint && (
                  <div className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] p-2 text-center text-xs font-mono font-bold">
                    DEMO OTP CODE: <span className="underline tracking-widest text-sm">{otpNotice.otp_hint}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc]">
                      ENTER 6-DIGIT OTP *
                    </label>
                    <span className="text-[10px] text-[#777777] dark:text-[#999999]">
                      {otpCountdown > 0 ? `EXPIRES IN ${otpCountdown}s` : 'EXPIRED'}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-base font-mono text-center tracking-[0.5em] bg-white dark:bg-[#222222] text-[#111111] dark:text-white border-2 border-[#111111] dark:border-white p-3 rounded-none font-black"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-[#666666] dark:text-[#888888]">DID NOT RECEIVE CODE?</span>
                  <button
                    type="button"
                    disabled={otpCountdown > 0 || loading}
                    onClick={handleSendOtp}
                    className={`font-bold uppercase ${
                      otpCountdown > 0 ? 'text-[#999999] cursor-not-allowed' : 'text-[#111111] dark:text-white underline cursor-pointer'
                    }`}
                  >
                    {otpCountdown > 0 ? `RESEND IN ${otpCountdown}s` : '[RESEND OTP]'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpInput.length !== 6}
                  className="btn-primary w-full py-3.5 text-xs font-bold uppercase rounded-none tracking-wider bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#333333] dark:hover:bg-[#e0e0e0]"
                >
                  {loading ? 'VERIFYING SECURITY PIN...' : 'VERIFY OTP & ENTER PATIENT PORTAL →'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer Security Notice */}
        <div className="pt-2 border-t border-[#CCCCCC] dark:border-[#333333] text-[10px] font-mono text-[#777777] dark:text-[#888888] flex items-center justify-between uppercase">
          <span>END-TO-END ENCRYPTED</span>
          <span>MEDICOLEGAL AUDITED</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VITE ENVIRONMENT-GATED DEVELOPMENT BYPASS HAZARD PANEL */}
      {/* Strictly rendered only when import.meta.env.DEV is true */}
      {/* ========================================================================= */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-400 text-black border-t-4 border-black font-mono text-xs px-4 py-2.5 shadow-2xl rounded-none">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="bg-black text-yellow-400 px-2 py-0.5 font-black uppercase text-[10px] tracking-wider rounded-none animate-pulse">
                ⚡ DEV TEST
              </span>
              <strong className="font-black uppercase tracking-wide text-xs">
                [DEVELOPMENT BYPASS ACTIVE]:
              </strong>
              <span className="hidden sm:inline text-[#222222] text-[11px]">
                Instant role injection (skips backend API handshake & persists in localStorage).
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDevBypass('ASHA')}
                className="bg-black text-white hover:bg-neutral-800 px-2.5 py-1 font-bold uppercase transition-none border border-black rounded-none cursor-pointer text-[11px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                [MOCK: ASHA]
              </button>
              <button
                type="button"
                onClick={() => handleDevBypass('PHC_DOCTOR')}
                className="bg-black text-white hover:bg-neutral-800 px-2.5 py-1 font-bold uppercase transition-none border border-black rounded-none cursor-pointer text-[11px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                [MOCK: PHC DOCTOR]
              </button>
              <button
                type="button"
                onClick={() => handleDevBypass('CHC_DOCTOR')}
                className="bg-black text-white hover:bg-neutral-800 px-2.5 py-1 font-bold uppercase transition-none border border-black rounded-none cursor-pointer text-[11px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                [MOCK: CHC DOCTOR]
              </button>
              <button
                type="button"
                onClick={() => handleDevBypass('PATIENT')}
                className="bg-black text-white hover:bg-neutral-800 px-2.5 py-1 font-bold uppercase transition-none border border-black rounded-none cursor-pointer text-[11px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                [MOCK: PATIENT]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
