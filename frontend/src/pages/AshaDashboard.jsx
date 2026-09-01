import React, { useState, useEffect } from 'react';
import {
  insertTriageRecord,
  updateTriageRecord,
  deleteTriageRecord,
  fetchRecentTriageRecords
} from '../services/supabaseService';
import { enqueueOfflineDocket } from '../services/offlineQueue';
import { getSocket } from '../services/socket';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { playNotificationChime } from '../services/audioAlert';
import HospitalList from '../components/HospitalList';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PRESET_CASES = [
  {
    code: 'CARD-01',
    label: 'Crushing Chest Pain & Sweating',
    patientName: 'Ramesh Kumar',
    patientAge: '52 yrs, Male',
    aadhaar: '5482 9103 8471',
    symptoms: '52-year-old male with sudden heavy crushing chest pain radiating to left arm and jaw, sweating profusely, cold skin, and breathlessness for past 45 minutes.',
    medicalHistory: 'Hypertension (5 years, on Amlodipine), Type 2 Diabetes, Previous coronary stent placed in 2023.',
    bpSys: '160',
    bpDia: '100',
    pulse: '110',
    spo2: '92',
    temp: '98.4',
    gcs: '15'
  },
  {
    code: 'TOX-02',
    label: 'Ophidian Bite With Edema',
    patientName: 'Shyam Sundar',
    patientAge: '30 yrs, Male',
    aadhaar: '8910 4728 1934',
    symptoms: '30-year-old farmer bitten on right foot by an unidentified snake in the fields 30 minutes ago. Two puncture marks visible, severe local swelling, and dizziness.',
    medicalHistory: 'No known prior chronic illnesses. No known drug allergies.',
    bpSys: '95',
    bpDia: '65',
    pulse: '122',
    spo2: '95',
    temp: '99.0',
    gcs: '15'
  },
  {
    code: 'FEV-03',
    label: 'Continuous High Fever (3 Days)',
    patientName: 'Pooja Devi',
    patientAge: '24 yrs, Female',
    aadhaar: '3819 2047 1928',
    symptoms: '24-year-old with continuous high fever (103°F) for 3 days, extreme chills, body ache, nausea, and dark urine.',
    medicalHistory: 'Tuberculosis (completed DOTS regimen 2 years ago). No current active medications.',
    bpSys: '110',
    bpDia: '70',
    pulse: '104',
    spo2: '97',
    temp: '103.2',
    gcs: '15'
  },
  {
    code: 'PEDS-04',
    label: 'Pediatric Fast Breathing & Stridor',
    patientName: 'Aarav Gupta',
    patientAge: '3 yrs, Male',
    aadhaar: '7461 9204 8192',
    symptoms: '3-year-old child with fast noisy breathing, chest indrawing, high fever, and inability to feed or drink water since last night.',
    medicalHistory: 'Childhood Asthma, recurrent wheezing attacks.',
    bpSys: '90',
    bpDia: '60',
    pulse: '145',
    spo2: '88',
    temp: '102.1',
    gcs: '13-14'
  },
  {
    code: 'CAT-05',
    label: 'Mild Cold & Runny Nose',
    patientName: 'Sunita Sharma',
    patientAge: '35 yrs, Female',
    aadhaar: '4820 1938 4920',
    symptoms: '35-year-old female with mild runny nose, slight throat tickle, and occasional dry cough for 1 day. No fever, normal appetite and breathing.',
    medicalHistory: 'No chronic diseases or past hospitalizations.',
    bpSys: '120',
    bpDia: '80',
    pulse: '72',
    spo2: '99',
    temp: '98.6',
    gcs: '15'
  }
];

// Helper to convert narrative or array first-aid instructions into bold, scannable bullet points
function renderFirstAidBullets(instructions) {
  if (!instructions) return null;

  let items = [];
  if (Array.isArray(instructions) && instructions.length > 0) {
    items = instructions.map((i) => String(i).trim()).filter(Boolean);
  } else if (typeof instructions === 'string') {
    const rawItems = instructions
      .split(/(?:\r?\n|(?<=[.!?])\s+(?=[0-9]+\.|\*|-|[A-Z]))/)
      .map((item) => item.trim().replace(/^[-*•\d.]+\s*/, ''))
      .filter((item) => item.length > 5);
    items = rawItems.length > 0 ? rawItems : [instructions.trim()];
  }

  return (
    <ul className="space-y-3 font-serif text-sm md:text-base text-[#111111] dark:text-[#f5f2eb] leading-relaxed">
      {items.map((item, idx) => {
        const words = item.split(' ');
        const leadCount = Math.min(3, words.length);
        const leadText = words.slice(0, leadCount).join(' ');
        const restText = words.slice(leadCount).join(' ');

        return (
          <li key={idx} className="flex items-start gap-3 border-b border-[#E5E5E0] dark:border-[#333333] last:border-b-0 pb-2.5 last:pb-0">
            <span className="font-mono text-[11px] font-black text-[#111111] dark:text-white bg-[#EAE8E2] dark:bg-[#333333] border border-[#111111] dark:border-white px-1.5 py-0.5 mt-0.5 shrink-0">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <div className="text-justify">
              <strong className="font-sans font-bold uppercase text-xs tracking-wider text-[#111111] dark:text-white mr-1.5">
                {leadText}:
              </strong>
              <span>
                {restText}
                {!item.endsWith('.') && !item.endsWith('!') ? '.' : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function AshaDashboard() {
  // Primary Symptoms & Demographics
  const [symptoms, setSymptoms] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  
  // Aadhaar Card UID State Variable
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Dedicated Medical History State Variable
  const [medicalHistory, setMedicalHistory] = useState('');

  // Structured Vitals & GCS
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [pulseRate, setPulseRate] = useState('');
  const [spO2, setSpO2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [gcsScore, setGcsScore] = useState('15');

  // UI Processing & Response State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Facility Referral State
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [dispatchStatusMessage, setDispatchStatusMessage] = useState(null);

  // Recent Patient Records & Edit/Delete State
  const [recentRecords, setRecentRecords] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    patient_name: '',
    patient_age: '',
    aadhaar_number: '',
    symptoms_text: '',
    medical_history: '',
    ai_urgency_score: 'Moderate',
    status: 'PENDING'
  });
  const [editSaving, setEditSaving] = useState(false);

  // Browser-Native Web Speech API Hook
  const {
    isSupported: isSpeechSupported,
    isListening,
    activeField,
    error: speechError,
    language: speechLang,
    startListening,
    stopListening,
    setLanguage: setSpeechLang
  } = useSpeechRecognition();

  // Load recent patient records on mount and subscribe to Socket.io events
  useEffect(() => {
    loadRegistryLogs();

    const socket = getSocket();
    if (socket) {
      const handleTriageUpdate = (record) => {
        setRecentRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)].slice(0, 30));
      };

      const handlePatientUpdated = (updated) => {
        setRecentRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      };

      const handlePatientDeleted = ({ id }) => {
        setRecentRecords((prev) => prev.filter((r) => r.id !== id));
      };

      socket.on('triage_update', handleTriageUpdate);
      socket.on('patient_updated', handlePatientUpdated);
      socket.on('triage_updated', handlePatientUpdated);
      socket.on('patient_deleted', handlePatientDeleted);
      socket.on('triage_deleted', handlePatientDeleted);

      return () => {
        socket.off('triage_update', handleTriageUpdate);
        socket.off('patient_updated', handlePatientUpdated);
        socket.off('triage_updated', handlePatientUpdated);
        socket.off('patient_deleted', handlePatientDeleted);
        socket.off('triage_deleted', handlePatientDeleted);
      };
    }
  }, []);

  const loadRegistryLogs = async () => {
    setLogsLoading(true);
    try {
      const { data } = await fetchRecentTriageRecords(15);
      setRecentRecords(data || []);
    } catch (err) {
      console.warn('Failed to load triage records:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Load Preset Case
  const handleLoadPreset = (preset) => {
    setSymptoms(preset.symptoms);
    setPatientName(preset.patientName || '');
    setPatientAge(preset.patientAge || '');
    setAadhaarNumber(preset.aadhaar || '');
    setMedicalHistory(preset.medicalHistory || '');
    setSystolicBP(preset.bpSys || '');
    setDiastolicBP(preset.bpDia || '');
    setPulseRate(preset.pulse || '');
    setSpO2(preset.spo2 || '');
    setTemperature(preset.temp || '');
    setGcsScore(preset.gcs || '15');
    setTriageResult(null);
    setError(null);
    setSelectedFacility(null);
    setDispatchStatusMessage(null);
  };

  // Analyze Clinical Severity & Submit Intake
  const handleAnalyzeSeverity = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      setError('Please enter patient clinical symptoms or use voice dictation before submitting.');
      return;
    }

    if (isListening) stopListening();

    setLoading(true);
    setError(null);
    setTriageResult(null);
    setSelectedFacility(null);
    setDispatchStatusMessage(null);

    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');

    const vitalsPayload = {};
    if (systolicBP || diastolicBP) {
      vitalsPayload.bp = `${systolicBP || '?'}/${diastolicBP || '?'} mmHg`;
    }
    if (pulseRate) vitalsPayload.pulse = `${pulseRate} bpm`;
    if (spO2) vitalsPayload.spO2 = `${spO2}%`;
    if (temperature) vitalsPayload.temperature = `${temperature} F`;

    const payload = {
      patient_name: patientName.trim() || undefined,
      patient_age: patientAge.trim() || undefined,
      aadhaar_number: cleanAadhaar || undefined,
      medical_history: medicalHistory.trim() || undefined,
      symptoms: symptoms.trim(),
      vitals: Object.keys(vitalsPayload).length > 0 ? vitalsPayload : undefined,
      gcs: gcsScore
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/triage/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setTriageResult(result);
      playNotificationChime();
      loadRegistryLogs();
    } catch (err) {
      console.warn('Backend unavailable, switching to Offline-First IndexedDB Queue & heuristic engine:', err.message);

      // Offline Heuristic Analysis
      const sym = (symptoms + ' ' + medicalHistory).toLowerCase();
      let urgency = 'Moderate';
      let specialist = 'Primary Health Centre (PHC) Medical Officer';
      let action = 'Ensure patient rests in comfortable position, monitor vitals hourly, and provide clean fluids.';

      if (
        sym.includes('chest pain') ||
        sym.includes('heart') ||
        sym.includes('snake') ||
        sym.includes('bite') ||
        sym.includes('stridor') ||
        sym.includes('cyanosis') ||
        sym.includes('unconscious') ||
        (spO2 && Number(spO2) < 90) ||
        (systolicBP && Number(systolicBP) > 170)
      ) {
        urgency = 'Critical';
        specialist = 'District Hospital / Tertiary Trauma Centre (Emergency Dept)';
        action = 'CRITICAL EMERGENCY: Administer immediate high-flow oxygen, establish IV access, and dispatch 108 ALS Ambulance.';
      } else if (
        sym.includes('fever') ||
        sym.includes('vomiting') ||
        sym.includes('fracture') ||
        sym.includes('asthma') ||
        (spO2 && Number(spO2) < 94)
      ) {
        urgency = 'High';
        specialist = 'Community Health Centre (CHC) - General Physician';
        action = 'URGENT: Initiate oral rehydration or nebulization, control fever with paracetamol, and arrange transport to CHC within 2 hours.';
      } else if (sym.includes('cold') || sym.includes('cough') || sym.includes('runny nose') || sym.includes('mild')) {
        urgency = 'Low';
        specialist = 'Health & Wellness Centre (HWC) / ASHA Home Care';
        action = 'ROUTINE: Provide warm steam inhalation, symptomatic relief, and monitor for red flag symptoms.';
      }

      const localResult = {
        urgency_score: urgency,
        suggested_specialist: specialist,
        immediate_action: action,
        directives: [action]
      };

      setTriageResult(localResult);
      playNotificationChime();

      // Offline Resilience Queue
      const offlinePayload = {
        patient_name: patientName.trim() || 'RURAL BENEFICIARY',
        patient_age: patientAge.trim() || 'UNKNOWN',
        aadhaar_number: cleanAadhaar,
        medical_history: medicalHistory.trim() || 'None recorded',
        symptoms: symptoms.trim(),
        urgency_score: urgency,
        suggested_specialist: specialist,
        immediate_action: action,
        vitals: vitalsPayload,
        gcs: gcsScore,
        status: 'PENDING'
      };

      try {
        await enqueueOfflineDocket(offlinePayload);
      } catch (queueErr) {
        console.warn('Local queue error:', queueErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Referral Dispatch Handler
  const handleConfirmReferralDispatch = async (facility) => {
    if (!facility) return;
    setSelectedFacility(facility);

    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
    const vitalsObj = {};
    if (systolicBP || diastolicBP) vitalsObj.bp = `${systolicBP || '?'}/${diastolicBP || '?'} mmHg`;
    if (pulseRate) vitalsObj.pulse = `${pulseRate} bpm`;
    if (spO2) vitalsObj.spO2 = `${spO2}%`;
    if (temperature) vitalsObj.temperature = `${temperature} F`;

    const payload = {
      patient_name: patientName.trim() || 'UNREGISTERED CASUALTY',
      patient_age: patientAge.trim() || 'UNKNOWN',
      aadhaar_number: cleanAadhaar,
      medical_history: medicalHistory.trim() || 'None recorded',
      symptoms: symptoms.trim(),
      urgency_score: triageResult?.urgency_score || 'Moderate',
      suggested_specialist: triageResult?.suggested_specialist || facility.type,
      immediate_action: triageResult?.immediate_action || 'Transfer to facility.',
      vitals: vitalsObj,
      gcs: gcsScore,
      referred_facility_id: facility.id,
      referred_facility_name: facility.name,
      status: 'DISPATCHED'
    };

    try {
      await insertTriageRecord(payload);
      setDispatchStatusMessage(
        `PATIENT REFERRAL CONFIRMED & DISPATCHED TO ${facility.name.toUpperCase()} (FAC-0${facility.id})`
      );
      loadRegistryLogs();
    } catch (err) {
      console.warn('Referral dispatch notice:', err.message);
    }
  };

  // EDIT RECORD HANDLERS
  const handleStartEdit = (record) => {
    setEditingRecord(record);
    const clinical = record.clinical_data || {};
    setEditForm({
      patient_name: clinical.patient_name || record.patient_name || '',
      patient_age: clinical.patient_age || record.patient_age || '',
      aadhaar_number: record.aadhaar_number || clinical.aadhaar_number || '',
      symptoms_text: record.symptoms_text || '',
      medical_history: record.medical_history || clinical.medical_history || '',
      ai_urgency_score: record.ai_urgency_score || 'Moderate',
      status: record.status || 'PENDING'
    });
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!editingRecord) return;

    setEditSaving(true);
    const cleanAadhaar = editForm.aadhaar_number ? editForm.aadhaar_number.replace(/\s+/g, '') : '';

    const updates = {
      patient_name: editForm.patient_name,
      patient_age: editForm.patient_age,
      aadhaar_number: cleanAadhaar,
      symptoms: editForm.symptoms_text,
      medical_history: editForm.medical_history,
      urgency_score: editForm.ai_urgency_score,
      status: editForm.status
    };

    try {
      await updateTriageRecord(editingRecord.id, updates);
      
      // Update local state immediately
      setRecentRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id
            ? {
                ...r,
                ...updates,
                clinical_data: {
                  ...r.clinical_data,
                  patient_name: editForm.patient_name,
                  patient_age: editForm.patient_age,
                  aadhaar_number: cleanAadhaar,
                  medical_history: editForm.medical_history
                }
              }
            : r
        )
      );

      setEditingRecord(null);
    } catch (err) {
      alert(`Failed to update record: ${err.message}`);
    } finally {
      setEditSaving(false);
    }
  };

  // DELETE RECORD HANDLER WITH BROWSER CONFIRMATION
  const handleDeleteRecord = async (id, patientDisplay) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete clinical triage record [${id}] for ${patientDisplay}? This action cannot be undone.`
    );
    if (!confirmed) return;

    // Optimistically remove from state
    setRecentRecords((prev) => prev.filter((r) => r.id !== id));

    try {
      await deleteTriageRecord(id);
    } catch (err) {
      console.warn('Delete warning:', err);
    }
  };

  const handleCopyReport = () => {
    if (!triageResult) return;
    const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
    const text = `THE CLINICAL DISPATCH • ASHA TRIAGE REPORT\n` +
      `==================================================\n` +
      (patientName ? `PATIENT: ${patientName} (${patientAge})\n` : '') +
      (cleanAadhaar ? `AADHAAR UID: ${cleanAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}\n` : '') +
      (medicalHistory ? `MEDICAL HISTORY & COMORBIDITIES: ${medicalHistory}\n` : '') +
      (systolicBP ? `VITALS: NIBP ${systolicBP}/${diastolicBP} mmHg | Pulse: ${pulseRate} bpm | SpO2: ${spO2}% | Temp: ${temperature}°F | GCS: ${gcsScore}/15\n` : '') +
      `ACUTE SYMPTOMS: ${symptoms}\n` +
      `URGENCY LEVEL: ${triageResult.urgency_score.toUpperCase()}\n` +
      `SUGGESTED SPECIALIST/FACILITY: ${triageResult.suggested_specialist}\n` +
      (selectedFacility ? `REFERRED FACILITY: ${selectedFacility.name} (${selectedFacility.type}) [FAC-0${selectedFacility.id}]\n` : '') +
      `IMMEDIATE DIRECTIVE:\n${triageResult.immediate_action}\n` +
      `TIMESTAMP: ${new Date().toISOString()}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (isListening) stopListening();
    setSymptoms('');
    setPatientName('');
    setPatientAge('');
    setAadhaarNumber('');
    setMedicalHistory('');
    setSystolicBP('');
    setDiastolicBP('');
    setPulseRate('');
    setSpO2('');
    setTemperature('');
    setGcsScore('15');
    setTriageResult(null);
    setError(null);
    setSelectedFacility(null);
    setDispatchStatusMessage(null);
  };

  const scoreLower = triageResult?.urgency_score?.toLowerCase();
  const isCriticalOrHigh = scoreLower === 'critical' || scoreLower === 'high';

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-serif text-black dark:text-[#f5f2eb]">
      
      {/* Offline Mode Indicator Banner */}
      {!isOnline && (
        <div className="mb-4 border-4 border-black dark:border-white bg-[#FFCC00] text-black p-3 font-mono font-black text-xs uppercase flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2">
            <span>📡</span>
            <span>[OFFLINE MODE: DATA SECURED] — NO CELLULAR / INTERNET CONNECTION DETECTED.</span>
          </div>
          <span className="text-[10px] bg-black text-white px-2 py-0.5">
            TRIAGE DOCKETS QUEUED TO ENCRYPTED INDEXEDDB
          </span>
        </div>
      )}

      {/* GLOBAL FORM WRAPPER: Guarantees base text inheritance (text-black dark:text-[#f5f2eb]) */}
      {/* Broadsheet Section Masthead */}
      <div className="border-b-4 border-black dark:border-white pb-3 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-bold uppercase text-[#777777] dark:text-[#aaaaaa] mb-1">
            FIELD REGISTRY • SECTION II
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-black text-black dark:text-white">
            ASHA Swasthya Sahayak Triage Portal
          </h2>
          <p className="font-serif italic text-sm text-[#555555] dark:text-[#aaaaaa] mt-1">
            Spatial split-pane clinical intake, voice dictation, Aadhaar UID integration, decoupled medical archive, and automated referral routing.
          </p>
        </div>

        <div className="border-2 border-black dark:border-white p-3 bg-[#F9F9F7] dark:bg-[#181818] font-mono text-xs text-right shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
          <div className="font-bold text-black dark:text-white">EMERGENCY HOTLINE: 108 / 102</div>
          <div className="text-[10px] text-[#777777] dark:text-[#aaaaaa] uppercase">NATIONAL AMBULANCE SERVICE</div>
        </div>
      </div>

      {/* Voice Dictation Status Notice */}
      {speechError && (
        <div className="mb-4 border-2 border-[#CC0000] p-2.5 font-mono text-xs text-[#CC0000] bg-[#FFF5F5] dark:bg-[#330000] flex items-center justify-between shadow-[3px_3px_0px_0px_rgba(204,0,0,1)]">
          <span>⚠️ [SPEECH RECOGNITION NOTICE]: {speechError}</span>
          <button
            type="button"
            onClick={() => stopListening()}
            className="underline font-bold uppercase text-[10px] cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SPATIAL DECOUPLING SPLIT-PANE GRID ARCHITECTURE (8 Cols vs 4 Cols) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN: ACTIVE INTAKE FORM & CLINICAL TRIAGE VERDICT (8 COLS) */}
        {/* ======================================================================= */}
        <section className="lg:col-span-8 border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#F9F9F7] dark:bg-[#181818] p-6 md:p-8 space-y-6 rounded-none text-black dark:text-[#f5f2eb]">
          
          <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2.5">
            <div className="flex items-center gap-2">
              <span className="step-badge">01</span>
              <h3 className="font-serif font-bold text-lg md:text-xl text-black dark:text-white uppercase">
                Active Patient Symptom Intake & Telemetry
              </h3>
            </div>
            {(symptoms || patientName || patientAge || aadhaarNumber || medicalHistory || triageResult) && (
              <button
                type="button"
                onClick={handleClear}
                className="font-mono text-xs uppercase underline text-[#777777] dark:text-[#aaaaaa] hover:text-black dark:hover:text-white cursor-pointer font-bold"
              >
                [CLEAR INTAKE]
              </button>
            )}
          </div>

          <form onSubmit={handleAnalyzeSeverity} className="space-y-5 font-sans">
            {/* 1. Patient Demographics & Aadhaar Meta Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                  PATIENT NAME / ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                  AGE & GENDER *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 48 yrs, Male"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1 font-mono text-[11px]">
                  <label className="font-bold uppercase text-[#444444] dark:text-[#cccccc]">
                    AADHAAR CARD (UID)
                  </label>
                  <span className="text-[10px] text-[#777777] dark:text-[#aaaaaa]">
                    {aadhaarNumber.replace(/\s+/g, '').length}/12
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={14}
                  placeholder="XXXX XXXX XXXX"
                  value={aadhaarNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setAadhaarNumber(formatted);
                  }}
                  className="w-full font-mono text-xs tracking-wider bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
              </div>
            </div>

            {/* 2. CHIEF COMPLAINT / ACUTE SYMPTOMS (WITH VOICE DICTATION) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-black dark:text-white uppercase">
                    CHIEF COMPLAINT & ACUTE SYMPTOMS *
                  </label>
                  
                  {/* High-Contrast Voice Input Button */}
                  {isSpeechSupported && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          startListening('symptoms', (text) => {
                            setSymptoms((prev) => (prev ? `${prev.trim()} ${text.trim()}` : text.trim()));
                          })
                        }
                        className={`px-2 py-0.5 border-2 text-[10px] font-bold uppercase transition-none cursor-pointer flex items-center gap-1 rounded-none ${
                          isListening && activeField === 'symptoms'
                            ? 'bg-[#CC0000] text-white border-[#CC0000] animate-pulse'
                            : 'border-black dark:border-white bg-[#F9F9F7] dark:bg-[#222222] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-black dark:text-white'
                        }`}
                        title="Click to dictate symptoms via microphone (Hindi / Indian English)"
                      >
                        <span>{isListening && activeField === 'symptoms' ? '● RECORDING (MIC ACTIVE)' : '🎤 [VOICE INPUT]'}</span>
                      </button>

                      {/* Language Context Selector */}
                      <button
                        type="button"
                        onClick={() => setSpeechLang((prev) => (prev === 'hi-IN' ? 'en-IN' : 'hi-IN'))}
                        className="px-1.5 py-0.5 border border-black dark:border-white bg-[#EAE8E2] dark:bg-[#333333] text-[9px] font-mono font-bold uppercase hover:bg-black hover:text-white rounded-none cursor-pointer text-black dark:text-white"
                        title="Switch speech recognition language (Hindi / English)"
                      >
                        [{speechLang === 'hi-IN' ? 'HI (हिन्दी)' : 'EN-IN'}]
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[#777777] dark:text-[#aaaaaa]">{symptoms.length} CHARACTERS</span>
              </div>

              <textarea
                rows={3}
                required
                placeholder="Enter patient acute symptoms or click [VOICE INPUT] to dictate symptoms in Hindi / English (e.g., 'छाती में तेज दर्द और सांस लेने में तकलीफ...')..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className={`w-full text-xs md:text-sm font-mono leading-relaxed bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-3 font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent ${
                  isListening && activeField === 'symptoms' ? 'border-[#CC0000] ring-2 ring-[#CC0000]' : ''
                }`}
              />
            </div>

            {/* 3. OPTIONAL VITALS & GCS TELEMETRY MATRIX (EXPLICIT HIGH CONTRAST) */}
            <div className="border-2 border-black dark:border-white p-4 bg-[#F4F2EC] dark:bg-[#1f1f1f] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-2">
              <div className="font-mono text-[10px] font-bold uppercase text-black dark:text-white border-b-2 border-black dark:border-white pb-1 flex items-center justify-between">
                <span>POINT-OF-CARE VITALS & CONSCIOUSNESS (OPTIONAL):</span>
                <span className="text-[9px] bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.2">TELEMETRY</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
                <div>
                  <span className="block text-[10px] text-[#555555] dark:text-[#cccccc] uppercase font-bold mb-1">NIBP (SYS/DIA)</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="120"
                      value={systolicBP}
                      onChange={(e) => setSystolicBP(e.target.value)}
                      className="w-1/2 text-center text-xs p-1.5 border-2 border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 rounded-none font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                    />
                    <span className="font-bold text-black dark:text-white">/</span>
                    <input
                      type="text"
                      placeholder="80"
                      value={diastolicBP}
                      onChange={(e) => setDiastolicBP(e.target.value)}
                      className="w-1/2 text-center text-xs p-1.5 border-2 border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 rounded-none font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] text-[#555555] dark:text-[#cccccc] uppercase font-bold mb-1">HR (BPM)</span>
                  <input
                    type="number"
                    placeholder="75"
                    value={pulseRate}
                    onChange={(e) => setPulseRate(e.target.value)}
                    className="w-full text-center text-xs p-1.5 border-2 border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 rounded-none font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-[#555555] dark:text-[#cccccc] uppercase font-bold mb-1">SPO2 (%)</span>
                  <input
                    type="number"
                    placeholder="98"
                    value={spO2}
                    onChange={(e) => setSpO2(e.target.value)}
                    className="w-full text-center text-xs p-1.5 border-2 border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 rounded-none font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-[#555555] dark:text-[#cccccc] uppercase font-bold mb-1">TEMP (°F)</span>
                  <input
                    type="text"
                    placeholder="98.6"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full text-center text-xs p-1.5 border-2 border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 rounded-none font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="block text-[10px] text-[#555555] dark:text-[#cccccc] uppercase font-bold mb-1">GCS SCALE</span>
                  <select
                    value={gcsScore}
                    onChange={(e) => setGcsScore(e.target.value)}
                    className="w-full text-xs p-1.5 border-2 border-black dark:border-white bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] rounded-none font-mono font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent cursor-pointer"
                  >
                    <option value="15">15 (NORMAL)</option>
                    <option value="13-14">13-14 (MILD)</option>
                    <option value="9-12">9-12 (MOD)</option>
                    <option value="3-8">3-8 (SEV)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Case Presets */}
            <div className="pt-1">
              <span className="font-mono text-[10px] font-bold uppercase text-[#777777] dark:text-[#aaaaaa] block mb-1">
                SAMPLE CLINICAL CASE TEMPLATES (CLICK TO LOAD):
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {PRESET_CASES.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className="border-2 border-black dark:border-white bg-white text-black dark:bg-[#222222] dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-2 py-1 text-[10px] font-bold uppercase transition-none cursor-pointer text-left rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    [{preset.code}] {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !symptoms.trim()}
                className="btn-primary w-full py-4 text-xs md:text-sm font-bold uppercase rounded-none tracking-wider bg-black dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-[#e0e0e0] flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin font-mono">◓</span>
                    <span>COMPUTING CLINICAL SEVERITY & COMORBIDITY INFERENCE...</span>
                  </>
                ) : (
                  <span>ANALYZE SEVERITY & CALCULATE TRIAGE VERDICT →</span>
                )}
              </button>
            </div>
          </form>

          {/* Error Notice */}
          {error && (
            <div className="border-2 border-[#CC0000] p-3.5 text-xs font-mono text-[#CC0000] bg-[#FFF5F5] dark:bg-[#330000] rounded-none">
              <strong>API COMMUNICATION NOTICE:</strong> {error}
            </div>
          )}

          {/* =================================================================== */}
          {/* TRIAGE VERDICT RESULTS SECTION (RENDERED PROMINENTLY IN ACTIVE FLOW) */}
          {/* =================================================================== */}
          {triageResult && !loading && (
            <div className="border-2 border-black dark:border-white p-5 md:p-6 bg-white dark:bg-[#202020] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 rounded-none text-black dark:text-[#f5f2eb]">
              <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="step-badge">02</span>
                  <h3 className="font-serif font-bold text-lg text-black dark:text-white uppercase">
                    Official Triage Verdict & Action Directives
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase bg-black dark:bg-white text-white dark:text-black px-2 py-0.5">
                  [CLASSIFIED]
                </span>
              </div>

              {/* Urgency Score Card */}
              <div
                className={`border-2 p-4 transition-none font-mono ${
                  isCriticalOrHigh
                    ? 'border-[#CC0000] bg-[#FFF5F5] dark:bg-[#330000] text-[#CC0000] dark:text-[#ff9999]'
                    : 'border-black dark:border-white bg-[#F9F9F7] dark:bg-[#1a1a1a] text-black dark:text-white'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1">
                  CLINICAL URGENCY LEVEL
                </div>
                <div className="text-2xl md:text-3xl font-serif font-black uppercase flex items-center justify-between">
                  <span>{triageResult.urgency_score}</span>
                  <span
                    className={`text-xs px-2.5 py-1 font-mono font-bold ${
                      isCriticalOrHigh
                        ? 'bg-[#CC0000] text-white'
                        : 'bg-black dark:bg-white text-white dark:text-black'
                    }`}
                  >
                    {isCriticalOrHigh ? 'SEV-1 URGENT REFERRAL' : 'ROUTINE CARE'}
                  </span>
                </div>

                {isCriticalOrHigh && (
                  <p className="font-serif text-xs md:text-sm font-bold text-[#CC0000] dark:text-[#ff9999] mt-2.5 pt-2 border-t border-[#CC0000]/30 leading-snug">
                    Immediate transfer required. Notify receiving facility and arrange priority ambulance transport without delay.
                  </p>
                )}
              </div>

              {/* Target Specialty Card */}
              <div className="border-2 border-black dark:border-white p-3.5 bg-[#F9F9F7] dark:bg-[#1a1a1a]">
                <div className="font-mono text-[10px] font-bold uppercase text-[#777777] dark:text-[#aaaaaa] mb-1">
                  TARGET SPECIALTY & FACILITY TIER
                </div>
                <div className="font-serif font-bold text-base md:text-lg text-black dark:text-white">
                  {triageResult.suggested_specialist}
                </div>
              </div>

              {/* Bullet-Point First-Aid Instructions */}
              <div className="border-2 border-black dark:border-white p-4 bg-[#F9F9F7] dark:bg-[#1a1a1a] space-y-2.5">
                <div className="font-mono text-[11px] font-bold uppercase text-black dark:text-white border-b pb-1 flex items-center justify-between">
                  <span>IMMEDIATE FIRST-AID DIRECTIVES</span>
                  <span className="text-[10px] text-[#777777] font-normal">[ACTION PROTOCOL]</span>
                </div>

                {renderFirstAidBullets(
                  triageResult.directives?.length > 0
                    ? triageResult.directives
                    : triageResult.immediate_action
                )}
              </div>

              {/* Dispatch Action Note if selected */}
              {selectedFacility && (
                <div className="border-2 border-black dark:border-white p-3 bg-black dark:bg-white text-white dark:text-black font-mono text-xs flex items-center justify-between">
                  <div>
                    <span className="text-gray-300 dark:text-gray-700 uppercase text-[10px] block">REFERRED FACILITY:</span>
                    <span className="font-bold text-sm">{selectedFacility.name.toUpperCase()} (FAC-0{selectedFacility.id})</span>
                  </div>
                  <span className="bg-[#CC0000] text-white text-[10px] font-bold px-2 py-0.5 uppercase">
                    DISPATCHED
                  </span>
                </div>
              )}

              {/* Action CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="btn-secondary w-full py-2.5 text-xs font-mono font-bold uppercase border-2 border-black dark:border-white cursor-pointer"
                >
                  {copied ? '✓ COPIED CLINICAL REPORT' : 'COPY REPORT FOR RECEIVING DOCTOR'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: DEDICATED STICKY MEDICAL HISTORY & PATIENT ARCHIVE (4 COLS) */}
        {/* ======================================================================= */}
        <aside className="lg:col-span-4 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#F9F9F7] dark:bg-[#181818] p-5 space-y-4 rounded-none text-black dark:text-[#f5f2eb]">
          
          {/* High-Visibility Inverted Header */}
          <div className="bg-black dark:bg-white text-[#F9F9F7] dark:text-black p-3.5 border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between rounded-none">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase tracking-wider">[PATIENT ARCHIVE]</span>
            </div>
            <span className="font-mono text-[9px] uppercase font-bold bg-[#CC0000] text-white px-2 py-0.5 rounded-none">
              LOCKED CONTEXT
            </span>
          </div>

          <p className="font-serif italic text-xs text-[#555555] dark:text-[#aaaaaa] leading-snug">
            Historical comorbidity ledger, chronic disease registry, and decoupled prior encounter archive.
          </p>

          {/* Hard-Bordered Card 1: Medical History & Chronic Conditions Input & Voice Dictation */}
          <div className="border-2 border-black dark:border-white p-4 bg-white dark:bg-[#222222] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3 rounded-none">
            <div className="flex items-center justify-between border-b border-[#CCCCCC] dark:border-[#444444] pb-1.5 font-mono text-[11px]">
              <label htmlFor="medical_history" className="font-bold text-black dark:text-white uppercase">
                CHRONIC COMORBIDITY INPUT
              </label>

              {/* High-Contrast Voice Input Button */}
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={() =>
                    startListening('medicalHistory', (text) => {
                      setMedicalHistory((prev) => (prev ? `${prev.trim()} ${text.trim()}` : text.trim()));
                    })
                  }
                  className={`px-2 py-0.5 border text-[9px] font-mono font-bold uppercase transition-none cursor-pointer flex items-center gap-1 rounded-none ${
                    isListening && activeField === 'medicalHistory'
                      ? 'bg-[#CC0000] text-white border-[#CC0000] animate-pulse'
                      : 'border-black dark:border-white bg-[#F9F9F7] dark:bg-[#1a1a1a] text-black dark:text-white hover:bg-black hover:text-white'
                  }`}
                  title="Click to dictate past chronic diseases and comorbidities via microphone"
                >
                  <span>{isListening && activeField === 'medicalHistory' ? '● MIC ACTIVE' : '🎤 [VOICE]'}</span>
                </button>
              )}
            </div>

            <textarea
              id="medical_history"
              name="medical_history"
              rows={3}
              placeholder="Enter chronic conditions or click [VOICE] to dictate past comorbidities (Hypertension, Diabetes, Asthma, TB history, Stent 2023)..."
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className={`w-full text-xs font-mono bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white p-2.5 leading-relaxed rounded-none font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent ${
                isListening && activeField === 'medicalHistory' ? 'border-[#CC0000] ring-2 ring-[#CC0000]' : ''
              }`}
            />

            {/* Quick Comorbidity Selectors */}
            <div>
              <span className="font-mono text-[9px] font-bold uppercase text-[#777777] dark:text-[#aaaaaa] block mb-1">
                QUICK COMORBIDITY INSERT:
              </span>
              <div className="flex flex-wrap gap-1 font-mono text-[9px]">
                {[
                  'Hypertension',
                  'Type 2 Diabetes',
                  'Asthma / COPD',
                  'Tuberculosis (TB)',
                  'Heart Disease / CAD',
                  'Past Stent (2023)',
                  'Renal Disease',
                  'Past Surgery'
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMedicalHistory((prev) => {
                        if (prev.includes(item)) return prev;
                        return prev ? `${prev}, ${item}` : item;
                      });
                    }}
                    className="border-2 border-black dark:border-white bg-white text-black dark:bg-[#1a1a1a] dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black px-1.5 py-0.5 font-bold uppercase transition-none cursor-pointer rounded-none"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hard-Bordered Card 2: Active Identity & Chronic Dossier */}
          <div className="border-2 border-black dark:border-white p-3.5 bg-white dark:bg-[#222222] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2 rounded-none">
            <div className="font-mono text-[10px] font-bold uppercase text-[#555555] dark:text-[#aaaaaa] border-b pb-1 flex justify-between">
              <span>PATIENT DOSSIER SUMMARY</span>
              <span className="bg-black dark:bg-white text-white dark:text-black px-1.5 text-[9px] font-bold">LOCKED</span>
            </div>
            <div className="font-mono text-xs text-black dark:text-white space-y-1.5">
              <div><strong>NAME:</strong> {patientName.trim() || 'UNREGISTERED CASUALTY'}</div>
              <div><strong>AGE / GENDER:</strong> {patientAge.trim() || 'NOT RECORDED'}</div>
              <div><strong>AADHAAR:</strong> {aadhaarNumber ? `XXXX-XXXX-${aadhaarNumber.replace(/\s+/g, '').slice(8) || '8471'}` : 'NOT PROVIDED'}</div>
              {medicalHistory && (
                <div className="p-2 border border-[#CCCCCC] dark:border-[#555555] bg-[#EAE8E2] dark:bg-[#181818] font-bold text-[11px] mt-1 text-black dark:text-white">
                  {medicalHistory}
                </div>
              )}
            </div>
          </div>

          {/* Hard-Bordered Card 3: Encapsulated Historical Visits & Past Triage Dockets */}
          <div className="border-2 border-black dark:border-white p-3.5 bg-white dark:bg-[#222222] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2.5 rounded-none">
            <div className="font-mono text-[10px] font-bold uppercase text-black dark:text-white border-b pb-1 flex items-center justify-between">
              <span>PAST ENCOUNTERS & VISITS</span>
              <span className="text-[#777777] dark:text-[#aaaaaa]">{recentRecords.length} ARCHIVED</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {recentRecords.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="border border-black dark:border-white p-2.5 bg-[#F9F9F7] dark:bg-[#181818] font-mono text-[11px] space-y-1 rounded-none"
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold text-black dark:text-white">{rec.id}</span>
                    <span className={`px-1.5 py-0.2 font-bold uppercase ${
                      rec.ai_urgency_score === 'Critical' || rec.urgency_score === 'Critical'
                        ? 'bg-[#CC0000] text-white'
                        : 'bg-black dark:bg-white text-white dark:text-black'
                    }`}>
                      {rec.ai_urgency_score || rec.urgency_score || 'Moderate'}
                    </span>
                  </div>
                  <div className="font-serif text-[11px] font-bold line-clamp-1 text-black dark:text-white">
                    {rec.clinical_data?.patient_name || rec.patient_name || 'Patient Encounter'}
                  </div>
                  <div className="text-[10px] text-[#555555] dark:text-[#aaaaaa] line-clamp-1">
                    {rec.symptoms_text}
                  </div>
                  {rec.medical_history && (
                    <div className="text-[9px] text-[#777777] dark:text-[#888888] italic border-t pt-0.5">
                      Chronic: {rec.medical_history}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#CCCCCC] dark:border-[#444444] text-[9px] font-mono text-[#777777] uppercase flex justify-between">
            <span>PATIENT ARCHIVE</span>
            <span>MEDICOLEGAL COMPLIANT</span>
          </div>
        </aside>
      </div>

      {/* SECTION 03: Embedded Regional Facility Directory */}
      <section className="mt-8 border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#F9F9F7] dark:bg-[#181818] p-6 rounded-none text-black dark:text-[#f5f2eb]">
        <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="step-badge">03</span>
            <h3 className="font-serif font-bold text-lg text-black dark:text-white uppercase">
              Attach Patient Referral to Regional Hospital
            </h3>
          </div>
          {dispatchStatusMessage && (
            <span className="font-mono text-xs font-bold text-black dark:text-white bg-[#EAE8E2] dark:bg-[#333333] border border-black dark:border-white px-2.5 py-1">
              ✓ {dispatchStatusMessage}
            </span>
          )}
        </div>

        <HospitalList
          onSelectFacility={(fac) => setSelectedFacility(fac)}
          onConfirmDispatch={handleConfirmReferralDispatch}
          selectedFacilityId={selectedFacility?.id}
          patientContext={{
            patientName: patientName.trim() || 'UNREGISTERED CASUALTY',
            patientAge,
            urgency_score: triageResult?.urgency_score,
            symptoms: `${symptoms} | Aadhaar: ${aadhaarNumber || 'None'} | History: ${medicalHistory || 'None'}`
          }}
          compact={false}
        />
      </section>

      {/* SECTION 04: Patient Triage & Chronic Comorbidity Audit Registry (Recent Logs) with Edit/Delete Actions */}
      <section className="mt-8 border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-[#F9F9F7] dark:bg-[#181818] p-6 space-y-4 rounded-none text-black dark:text-[#f5f2eb]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black dark:border-white pb-3">
          <div className="flex items-center gap-2">
            <span className="step-badge">04</span>
            <h3 className="font-serif font-bold text-lg text-black dark:text-white uppercase">
              Patient Triage & Chronic Comorbidity Audit Registry
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#777777] dark:text-[#aaaaaa] uppercase">
              {recentRecords.length} CASES RECORDED IN SUPABASE
            </span>
            <button
              type="button"
              onClick={loadRegistryLogs}
              className="btn-secondary text-[10px] py-1 px-2.5 font-mono font-bold uppercase border-2 border-black dark:border-white cursor-pointer"
            >
              REFRESH LOGS
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div className="p-6 text-center font-mono text-xs text-[#777777]">
            [QUERYING TRIAGE AUDIT RECORDS FROM SUPABASE...]
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="p-6 text-center font-serif text-xs text-[#777777]">
            No triage records docked yet. Submit a triage evaluation above to generate your first audit record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-serif text-xs">
              <thead>
                <tr className="border-b-2 border-black dark:border-white bg-black dark:bg-[#222222] text-[#F9F9F7] font-mono text-[11px] uppercase">
                  <th className="p-3 border-r border-[#444444] w-24">RECORD ID</th>
                  <th className="p-3 border-r border-[#444444] w-40">PATIENT / AADHAAR</th>
                  <th className="p-3 border-r border-[#444444] w-1/3">CHIEF COMPLAINTS</th>
                  <th className="p-3 border-r border-[#444444] w-1/3 bg-[#222222]">
                    MEDICAL HISTORY & CHRONIC CONDITIONS
                  </th>
                  <th className="p-3 border-r border-[#444444] w-28 text-center">URGENCY</th>
                  <th className="p-3 border-r border-[#444444] w-32 text-center">STATUS</th>
                  <th className="p-3 w-32 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black dark:divide-white">
                {recentRecords.map((record) => {
                  const recordUrgency = (record.ai_urgency_score || '').toUpperCase();
                  const isCrit = recordUrgency === 'CRITICAL';
                  const isHgh = recordUrgency === 'HIGH';

                  const patientDisplay =
                    record.clinical_data?.patient_name ||
                    record.patient_name ||
                    'ANONYMOUS';
                  
                  const ageDisplay =
                    record.clinical_data?.patient_age ||
                    record.patient_age ||
                    '';

                  const rawAadhaar =
                    record.aadhaar_number ||
                    record.clinical_data?.aadhaar_number ||
                    '';

                  const medHistory =
                    record.medical_history ||
                    record.clinical_data?.medical_history ||
                    '';

                  return (
                    <tr key={record.id} className="hover:bg-[#EFEFEA] dark:hover:bg-[#252525] transition-none">
                      <td className="p-3 font-mono text-[11px] border-r border-black dark:border-white">
                        <span className="font-bold text-black dark:text-white">{record.id}</span>
                        <div className="text-[9px] text-[#777777] dark:text-[#aaaaaa] mt-0.5">
                          {record.created_at
                            ? new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'RECENT'}
                        </div>
                      </td>

                      <td className="p-3 font-bold text-black dark:text-white border-r border-black dark:border-white">
                        <div>{patientDisplay}</div>
                        {ageDisplay && (
                          <div className="font-mono text-[10px] text-[#666666] dark:text-[#aaaaaa] font-normal">
                            {ageDisplay}
                          </div>
                        )}
                        {rawAadhaar && (
                          <div className="font-mono text-[10px] text-[#222222] dark:text-white bg-[#EAE8E2] dark:bg-[#333333] px-1 py-0.2 border border-[#CCCCCC] dark:border-[#555555] mt-1 inline-block">
                            UID: {rawAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-[#333333] dark:text-[#dddddd] border-r border-black dark:border-white leading-relaxed">
                        {record.symptoms_text}
                      </td>

                      {/* DEDICATED VISUAL CONTAINER FOR MEDICAL HISTORY DISPLAY */}
                      <td className="p-3 border-r border-black dark:border-white bg-[#F4F2EC] dark:bg-[#1f1f1f]">
                        {medHistory ? (
                          <div className="font-mono text-xs font-bold text-black dark:text-white bg-[#EAE8E2] dark:bg-[#2a2a2a] border border-black dark:border-white p-2 leading-snug">
                            {medHistory}
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-[#888888] uppercase italic">
                            [NO CHRONIC COMORBIDITIES RECORDED]
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center border-r border-black dark:border-white">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 uppercase ${
                            isCrit || isHgh
                              ? 'bg-[#CC0000] text-white'
                              : 'bg-black dark:bg-white text-white dark:text-black'
                          }`}
                        >
                          {record.ai_urgency_score || 'Moderate'}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono text-[10px] border-r border-black dark:border-white">
                        <div className="font-bold text-black dark:text-white uppercase">
                          {record.status || 'PENDING'}
                        </div>
                        {record.referred_facility_name && (
                          <div className="text-[#666666] dark:text-[#aaaaaa] truncate max-w-[120px] mx-auto text-[9px]">
                            {record.referred_facility_name}
                          </div>
                        )}
                      </td>

                      {/* ACTION BUTTONS: [EDIT] / [DELETE] */}
                      <td className="p-3 text-right font-mono text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(record)}
                            className="border border-black dark:border-white bg-[#F9F9F7] dark:bg-[#222222] hover:bg-black hover:text-[#F9F9F7] dark:hover:bg-white dark:hover:text-black px-2 py-0.5 text-[10px] font-bold uppercase transition-none cursor-pointer rounded-none text-black dark:text-white"
                            title="Edit patient clinical profile"
                          >
                            [EDIT]
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(record.id, patientDisplay)}
                            className="border border-[#CC0000] bg-[#FFF5F5] dark:bg-[#330000] text-[#CC0000] hover:bg-[#CC0000] hover:text-white px-2 py-0.5 text-[10px] font-bold uppercase transition-none cursor-pointer rounded-none"
                            title="Permanently remove triage record"
                          >
                            [DEL]
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* EDIT CLINICAL RECORD MODAL POPUP */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F9F7] dark:bg-[#181818] border-4 border-black dark:border-white p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto rounded-none text-black dark:text-[#f5f2eb]">
            <div className="border-b-2 border-black dark:border-white pb-2 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-[#777777] dark:text-[#aaaaaa]">
                  RECORD REVISION • CLINICAL AUDIT
                </span>
                <h3 className="text-xl font-bold font-serif uppercase text-black dark:text-white">
                  Edit Patient Record [{editingRecord.id}]
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="font-mono font-bold text-sm text-[#777777] hover:text-black dark:hover:text-white border border-black dark:border-white px-2 py-0.5 bg-[#EAE8E2] dark:bg-[#333333] rounded-none cursor-pointer"
              >
                ✕ ESC
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                    PATIENT NAME
                  </label>
                  <input
                    type="text"
                    value={editForm.patient_name}
                    onChange={(e) => setEditForm({ ...editForm, patient_name: e.target.value })}
                    className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2 font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                    AGE & GENDER
                  </label>
                  <input
                    type="text"
                    value={editForm.patient_age}
                    onChange={(e) => setEditForm({ ...editForm, patient_age: e.target.value })}
                    className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2 font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                    AADHAAR CARD (UID)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={editForm.aadhaar_number}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                      const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
                      setEditForm({ ...editForm, aadhaar_number: formatted });
                    }}
                    className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2 font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-mono text-[10px] font-bold uppercase text-[#444444] dark:text-[#cccccc]">
                    CHIEF COMPLAINT & PRESENTING SYMPTOMS
                  </label>
                  {isSpeechSupported && (
                    <button
                      type="button"
                      onClick={() =>
                        startListening('editSymptoms', (text) => {
                          setEditForm((prev) => ({
                            ...prev,
                            symptoms_text: prev.symptoms_text ? `${prev.symptoms_text.trim()} ${text.trim()}` : text.trim()
                          }));
                        })
                      }
                      className={`px-1.5 py-0.2 border text-[9px] font-mono font-bold uppercase rounded-none cursor-pointer ${
                        isListening && activeField === 'editSymptoms'
                          ? 'bg-[#CC0000] text-white border-[#CC0000] animate-pulse'
                          : 'border-black dark:border-white bg-[#F9F9F7] dark:bg-[#222222] text-black dark:text-white'
                      }`}
                    >
                      {isListening && activeField === 'editSymptoms' ? '● MIC ACTIVE' : '🎤 [VOICE]'}
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={editForm.symptoms_text}
                  onChange={(e) => setEditForm({ ...editForm, symptoms_text: e.target.value })}
                  className="w-full font-mono text-xs leading-relaxed bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2 font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-mono text-[10px] font-bold uppercase text-[#444444] dark:text-[#cccccc]">
                    MEDICAL HISTORY & CHRONIC COMORBIDITIES
                  </label>
                  {isSpeechSupported && (
                    <button
                      type="button"
                      onClick={() =>
                        startListening('editMedHistory', (text) => {
                          setEditForm((prev) => ({
                            ...prev,
                            medical_history: prev.medical_history ? `${prev.medical_history.trim()} ${text.trim()}` : text.trim()
                          }));
                        })
                      }
                      className={`px-1.5 py-0.2 border text-[9px] font-mono font-bold uppercase rounded-none cursor-pointer ${
                        isListening && activeField === 'editMedHistory'
                          ? 'bg-[#CC0000] text-white border-[#CC0000] animate-pulse'
                          : 'border-black dark:border-white bg-[#F9F9F7] dark:bg-[#222222] text-black dark:text-white'
                      }`}
                    >
                      {isListening && activeField === 'editMedHistory' ? '● MIC ACTIVE' : '🎤 [VOICE]'}
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={editForm.medical_history}
                  onChange={(e) => setEditForm({ ...editForm, medical_history: e.target.value })}
                  className="w-full font-mono text-xs leading-relaxed bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 dark:placeholder-gray-400 border-2 border-black dark:border-white rounded-none p-2 font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                    URGENCY SCORE OVERRIDE
                  </label>
                  <select
                    value={editForm.ai_urgency_score}
                    onChange={(e) => setEditForm({ ...editForm, ai_urgency_score: e.target.value })}
                    className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent cursor-pointer"
                  >
                    <option value="Critical">Critical (Immediate 108 Transfer)</option>
                    <option value="High">High (Urgent Emergency Care)</option>
                    <option value="Moderate">Moderate (PHC/CHC Evaluation)</option>
                    <option value="Low">Low (Supportive Home Care)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase text-[#444444] dark:text-[#cccccc] mb-1">
                    RECORD STATUS
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent cursor-pointer"
                  >
                    <option value="DISPATCHED">DISPATCHED</option>
                    <option value="REFERRED">REFERRED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-black dark:border-white flex items-center justify-end gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="btn-secondary py-2 px-4 text-xs font-bold uppercase border-2 border-black dark:border-white rounded-none cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 font-bold uppercase border-2 border-black dark:border-white rounded-none bg-black dark:bg-white text-white dark:text-black cursor-pointer"
                >
                  {editSaving ? 'UPDATING RECORD...' : 'SAVE CLINICAL RECORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
