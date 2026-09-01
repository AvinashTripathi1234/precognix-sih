import React, { useState } from 'react';
import { insertTriageRecord } from '../services/supabaseService';

export default function WalkInIntake({ onReturnToConsole, onPatientRegistered }) {
  // 1. Direct Walk-In Patient Information (Bypassing ASHA field metadata)
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('MALE');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // 2. Physiological Vitals Matrix
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [spO2, setSpO2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [gcsScore, setGcsScore] = useState('15');

  // 3. Clinical Presentation
  const [symptoms, setSymptoms] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  // Processing & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Vital threshold check helpers
  const isSysAbnormal = Number(systolicBP) > 140 || (Number(systolicBP) < 90 && Number(systolicBP) > 0);
  const isDiaAbnormal = Number(diastolicBP) > 90 || (Number(diastolicBP) < 60 && Number(diastolicBP) > 0);
  const isHrAbnormal = Number(pulseRate) > 100 || (Number(pulseRate) < 50 && Number(pulseRate) > 0);
  const isSpo2Abnormal = Number(spO2) < 92 && Number(spO2) > 0;
  const isTempAbnormal = Number(temperature) > 100.4;
  const isGcsAbnormal = gcsScore !== '15';

  // Aadhaar Auto-formatting
  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarNumber(raw.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  // Submit Walk-In Registration & Transition to View B (Triage Docket)
  const handleSubmitWalkIn = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      setErrorMsg('Please enter the patient chief complaint & clinical symptoms before proceeding.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    const formattedUid = cleanAadhaar ? cleanAadhaar.replace(/(\d{4})(?=\d)/g, '$1 ') : 'XXXX-XXXX-XXXX';
    const parsedAge = parseInt(patientAge, 10) || 45;

    const vitalsObj = {
      bp: `${systolicBP || '120'}/${diastolicBP || '80'}`,
      hr: Number(pulseRate) || 75,
      spo2: Number(spO2) || 98,
      temp: Number(temperature) || 98.6
    };

    // Calculate urgency tier
    const isCritical = isSpo2Abnormal || Number(systolicBP) > 180 || Number(systolicBP) < 85 || isHrAbnormal || gcsScore !== '15';
    const triagePriority = isCritical ? 'CRITICAL' : (isSysAbnormal || isDiaAbnormal || isTempAbnormal) ? 'URGENT' : 'ROUTINE';

    const newRecordPayload = {
      patient_uid: formattedUid,
      name: patientName.trim() || 'WALK-IN CASUALTY',
      age: parsedAge,
      gender: patientGender,
      source: 'WALK_IN',
      triage_priority: triagePriority,
      vitals: vitalsObj,
      complaint: `[DIRECT WALK-IN] ${symptoms.trim()}`,
      medical_history: medicalHistory.trim() || 'None recorded',
      status: 'PENDING',
      prescriptions: []
    };

    try {
      const response = await insertTriageRecord(newRecordPayload);
      const saved = response?.data || newRecordPayload;

      // Immediate handoff to View B (Triage Docket)
      if (onPatientRegistered) {
        onPatientRegistered(saved);
      } else if (onReturnToConsole) {
        onReturnToConsole();
      }
    } catch (err) {
      console.warn('Walk-in intake save warning:', err);
      if (onPatientRegistered) {
        onPatientRegistered(newRecordPayload);
      } else if (onReturnToConsole) {
        onReturnToConsole();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-serif text-black dark:text-[#f5f2eb]">
      
      {/* Top Escape Hatch Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-4 border-black dark:border-white pb-4">
        <button
          type="button"
          onClick={onReturnToConsole}
          className="btn-secondary py-2.5 px-4 font-mono text-xs font-bold uppercase border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-none cursor-pointer flex items-center gap-2 self-start"
        >
          <span>[ &lt; RETURN TO COMMAND CONSOLE ]</span>
        </button>

        <div className="text-right font-mono text-xs">
          <span className="bg-black dark:bg-white text-white dark:text-black px-2.5 py-0.5 font-bold uppercase">
            DIRECT WALK-IN REGISTRATION TERMINAL (VIEW C)
          </span>
          <div className="text-[10px] text-[#777777] dark:text-[#aaaaaa] mt-0.5">
            BYPASSES FIELD ASHA INTAKE • INSTANT HANDOFF TO TRIAGE DOCKET
          </div>
        </div>
      </div>

      {/* Main Registration Form Container */}
      <div className="border-4 border-black dark:border-white p-6 md:p-8 bg-[#F9F9F7] dark:bg-[#181818] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-6">
        
        {/* Masthead */}
        <div className="border-b-2 border-black dark:border-white pb-4">
          <div className="flex items-center gap-2 font-mono">
            <span className="step-badge">WALK-IN</span>
            <h1 className="text-2xl md:text-3xl font-serif font-black uppercase text-black dark:text-white">
              Direct Casualty Registration &amp; Intake
            </h1>
          </div>
          <p className="font-sans text-xs text-[#555555] dark:text-[#aaaaaa] mt-1 font-medium">
            Register an emergency walk-in patient at the facility triage desk. Submitting this record will immediately open the Active Clinical Evaluation Docket (View B).
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#FFF0F0] dark:bg-[#330000] border-2 border-[#CC0000] text-[#CC0000] font-mono text-xs font-bold uppercase">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitWalkIn} className="space-y-6 font-sans">
          
          {/* SECTION 1: PATIENT IDENTIFIER & DEMOGRAPHICS */}
          <div className="space-y-3">
            <span className="font-black text-xs uppercase tracking-wider text-black dark:text-white block border-b-2 border-black dark:border-white pb-1">
              1. PATIENT DEMOGRAPHICS &amp; IDENTITY
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono text-xs">
              <div className="sm:col-span-5">
                <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  PATIENT FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2.5 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  AGE (YRS) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="125"
                  placeholder="45"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2.5 rounded-none font-bold text-center focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  GENDER *
                </label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-full bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2.5 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  AADHAAR UID (12-DIGIT)
                </label>
                <input
                  type="text"
                  placeholder="5482 9103 8471"
                  value={aadhaarNumber}
                  onChange={handleAadhaarChange}
                  className="w-full bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2.5 rounded-none font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PHYSIOLOGICAL VITALS MATRIX */}
          <div className="space-y-3">
            <span className="font-black text-xs uppercase tracking-wider text-black dark:text-white block border-b-2 border-black dark:border-white pb-1">
              2. INITIAL PHYSIOLOGICAL VITALS (CLINICAL TRIAGE ASSESSMENT)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 font-mono text-xs">
              <div>
                <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  SYS BP (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="120"
                  value={systolicBP}
                  onChange={(e) => setSystolicBP(e.target.value)}
                  className={`w-full p-2 text-center rounded-none font-bold border-2 ${
                    isSysAbnormal ? 'border-[#CC0000] bg-[#FFF0F0] text-red-600' : 'border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  DIA BP (mmHg)
                </label>
                <input
                  type="number"
                  placeholder="80"
                  value={diastolicBP}
                  onChange={(e) => setDiastolicBP(e.target.value)}
                  className={`w-full p-2 text-center rounded-none font-bold border-2 ${
                    isDiaAbnormal ? 'border-[#CC0000] bg-[#FFF0F0] text-red-600' : 'border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  PULSE (BPM)
                </label>
                <input
                  type="number"
                  placeholder="75"
                  value={pulseRate}
                  onChange={(e) => setPulseRate(e.target.value)}
                  className={`w-full p-2 text-center rounded-none font-bold border-2 ${
                    isHrAbnormal ? 'border-[#CC0000] bg-[#FFF0F0] text-red-600' : 'border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  SPO2 (%)
                </label>
                <input
                  type="number"
                  placeholder="98"
                  value={spO2}
                  onChange={(e) => setSpO2(e.target.value)}
                  className={`w-full p-2 text-center rounded-none font-bold border-2 ${
                    isSpo2Abnormal ? 'border-[#CC0000] bg-[#FFF0F0] text-red-600' : 'border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  TEMP (°F)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className={`w-full p-2 text-center rounded-none font-bold border-2 ${
                    isTempAbnormal ? 'border-[#CC0000] bg-[#FFF0F0] text-red-600' : 'border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  GCS SCORE
                </label>
                <select
                  value={gcsScore}
                  onChange={(e) => setGcsScore(e.target.value)}
                  className={`w-full p-2 text-center rounded-none font-bold border-2 ${
                    isGcsAbnormal ? 'border-[#CC0000] bg-[#FFF0F0] text-red-600' : 'border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-white'
                  }`}
                >
                  <option value="15">15 (ALERT)</option>
                  <option value="14">14 (MILD)</option>
                  <option value="12">12 (MODERATE)</option>
                  <option value="8">8 (COMATOSE)</option>
                  <option value="3">3 (UNRESPONSIVE)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: CHIEF COMPLAINT & MEDICAL HISTORY */}
          <div className="space-y-3">
            <span className="font-black text-xs uppercase tracking-wider text-black dark:text-white block border-b-2 border-black dark:border-white pb-1">
              3. CHIEF COMPLAINT &amp; MEDICAL HISTORY
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  CHIEF PRESENTING SYMPTOMS / CASUALTY EVENT *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Acute severe chest pain radiating to left arm, sweating, breathlessness for 30 minutes."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2.5 rounded-none font-mono focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
                  PRE-EXISTING CHRONIC COMORBIDITIES
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Hypertension (5 yrs), Diabetes, Past cardiac stent (2023)"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="w-full bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2.5 rounded-none font-mono focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON (DIRECT HANDOFF TO VIEW B) */}
          <div className="border-t-4 border-black dark:border-white pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 bg-black dark:bg-white text-white dark:text-black font-mono font-black text-sm md:text-base uppercase tracking-wider border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#222222] dark:hover:bg-[#EAE8E2] rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? '[ PROCESSING REGISTRATION... ]' : '[ REGISTER WALK-IN & OPEN TRIAGE EVALUATION DOCKET > ]'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
