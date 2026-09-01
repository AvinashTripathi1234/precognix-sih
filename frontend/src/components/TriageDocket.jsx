import React, { useState } from 'react';
import PrescriptionModule from './PrescriptionModule';
import { acknowledgeTriageRecord, updateTriageRecord } from '../services/supabaseService';

// 5 Standardized Rural Emergency Protocols for Quick Context Injection
const CLINICAL_PROTOCOLS = [
  {
    code: 'CARD-01',
    label: '⚡ ACS / CHEST PAIN',
    category: 'CARDIOLOGY',
    defaultRx: [
      { id: 'RX-1', medication: 'Aspirin (Loading Dose)', dosage: '300mg', frequency: 'Stat', duration: 'Single dose', instructions: 'Chew immediately' },
      { id: 'RX-2', medication: 'Clopidogrel (Loading Dose)', dosage: '300mg', frequency: 'Stat', duration: 'Single dose', instructions: 'Take with water' }
    ],
    defaultTests: ['12-LEAD ECG TELEMETRY', 'RAPID TROPONIN-I CARDIAC BIOMARKER']
  },
  {
    code: 'TOX-02',
    label: '🐍 SNAKE ENVENOMATION',
    category: 'TOXICOLOGY',
    defaultRx: [
      { id: 'RX-1', medication: 'Anti-Snake Venom (ASV)', dosage: '10 Vials in 500ml NS', frequency: 'IV Infusion over 1 hr', duration: '1 Day', instructions: 'Monitor for anaphylaxis' }
    ],
    defaultTests: ['COMPLETE BLOOD COUNT (CBC)', 'SERUM ELECTROLYTES & RENAL PANEL']
  },
  {
    code: 'NEURO-03',
    label: '🧠 ACUTE STROKE / CVA',
    category: 'NEUROLOGY',
    defaultRx: [],
    defaultTests: ['CHEST X-RAY (PA VIEW)', 'RANDOM BLOOD SUGAR (RBS)']
  },
  {
    code: 'PED-04',
    label: '🫁 PEDIATRIC STRIDOR',
    category: 'PEDIATRICS',
    defaultRx: [
      { id: 'RX-1', medication: 'Salbutamol Nebulization', dosage: '2.5mg', frequency: 'Stat / Q20M x3', duration: '1 Day', instructions: 'High-flow humidified O2' }
    ],
    defaultTests: ['CHEST X-RAY (PA VIEW)', 'COMPLETE BLOOD COUNT (CBC)']
  },
  {
    code: 'MAT-05',
    label: '🤰 ECLAMPSIA IN LABOUR',
    category: 'OBSTETRICS',
    defaultRx: [
      { id: 'RX-1', medication: 'Magnesium Sulphate (Prichard Regimen)', dosage: '4g IV + 10g IM', frequency: 'Stat loading dose', duration: 'Single dose', instructions: 'Check patellar reflex and RR' }
    ],
    defaultTests: ['URINE ROUTINE & MICROSCOPY', 'RANDOM BLOOD SUGAR (RBS)']
  }
];

// Historical Visits Mock Archive for Right Pane Context
const MOCK_HISTORICAL_VISITS = [
  {
    date: '14 JUN 2026',
    facility: 'Kauriram CHC',
    doctor: 'Dr. Anand Verma',
    diagnosis: 'Hypertensive Urgency (BP 170/105) - Prescribed Amlodipine 5mg OD',
    outcome: 'Resolved & Discharged'
  },
  {
    date: '02 FEB 2026',
    facility: 'Pipraich PHC',
    doctor: 'Dr. S. K. Gupta',
    diagnosis: 'Acute Gastroenteritis with dehydration - IV Ringer Lactate + ORS',
    outcome: 'Stabilized'
  },
  {
    date: '18 AUG 2025',
    facility: 'Gorakhpur District Hospital',
    doctor: 'Dr. R. P. Singh (Cardiology)',
    diagnosis: 'Post-PTCA Stent Follow-up (LAD Stent placed in 2023) - Ejection Fraction 52%',
    outcome: 'Maintenance Therapy'
  }
];

export default function TriageDocket({ patient, onReturnToConsole, onDispositionExecuted }) {
  if (!patient) return null;

  // Selected Emergency Protocol Tag
  const [selectedProtocolCode, setSelectedProtocolCode] = useState(null);

  // Active Prescriptions & Lab Test Orders
  const [prescriptions, setPrescriptions] = useState(patient.prescriptions || []);
  const [diagnosticTests, setDiagnosticTests] = useState([]);

  // Disposition Execution State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState(null);

  // Normalize patient metadata
  const patientName = patient.name || patient.patient_name || patient.clinical_data?.patient_name || 'UNREGISTERED CASUALTY';
  const patientAge = patient.age || patient.patient_age || '45';
  const patientGender = patient.gender || 'MALE';
  const patientUid = patient.patient_uid || patient.aadhaar_number || 'XXXX-XXXX-XXXX';
  const historyText = patient.medical_history || patient.clinical_data?.medical_history || 'No pre-existing chronic conditions recorded.';
  const complaintText = patient.complaint || patient.symptoms_text || patient.symptoms || 'Acute clinical presentation recorded at triage.';
  
  // Vitals matrix extraction
  const vitals = patient.vitals || patient.clinical_data?.vitals || {};
  const sysBp = String(vitals.bp || '120/80').split('/')[0] || '120';
  const diaBp = String(vitals.bp || '120/80').split('/')[1]?.replace(/\D/g, '') || '80';
  const hr = String(vitals.hr || vitals.pulse || '75').replace(/\D/g, '');
  const spo2 = String(vitals.spo2 || vitals.spO2 || '98').replace(/\D/g, '');
  const temp = String(vitals.temp || vitals.temperature || '98.6').replace(/[^\d.]/g, '');
  const gcs = String(patient.gcs || patient.clinical_data?.gcs || '15');

  // Out-of-bounds vitals check
  const isSysAbnormal = Number(sysBp) > 140 || (Number(sysBp) < 90 && Number(sysBp) > 0);
  const isDiaAbnormal = Number(diaBp) > 90 || (Number(diaBp) < 60 && Number(diaBp) > 0);
  const isHrAbnormal = Number(hr) > 100 || (Number(hr) < 50 && Number(hr) > 0);
  const isSpo2Abnormal = Number(spo2) < 92 && Number(spo2) > 0;
  const isTempAbnormal = Number(temp) > 100.4;
  const isGcsAbnormal = gcs !== '15';

  // Handle Protocol Tag Toggle
  const handleToggleProtocol = (proto) => {
    if (selectedProtocolCode === proto.code) {
      setSelectedProtocolCode(null);
    } else {
      setSelectedProtocolCode(proto.code);
      // Auto-inject default medication recommendations & diagnostic tests
      if (proto.defaultRx.length > 0 && prescriptions.length === 0) {
        setPrescriptions(proto.defaultRx);
      }
      if (proto.defaultTests.length > 0) {
        setDiagnosticTests((prev) => Array.from(new Set([...prev, ...proto.defaultTests])));
      }
    }
  };

  // Execute Final Triage Disposition Action
  const handleExecuteVerdict = async (decisionTier, note) => {
    setIsSubmitting(true);
    const statusMap = {
      DISPATCH: 'DISPATCHED',
      ADMIT: 'ADMITTED',
      DISCHARGE: 'DISCHARGED'
    };
    const newStatus = statusMap[decisionTier] || 'RESOLVED';

    const updatePayload = {
      status: newStatus,
      immediate_action: note,
      prescriptions,
      diagnostic_tests: diagnosticTests,
      protocol_code: selectedProtocolCode
    };

    try {
      if (patient.id) {
        await acknowledgeTriageRecord(patient.id, 'DR_ANAND_VERMA_CHC');
        await updateTriageRecord(patient.id, updatePayload);
      }

      setDecisionFeedback(`✓ CLINICAL DISPOSITION LOGGED: [${newStatus}] — ${note}`);

      setTimeout(() => {
        if (onDispositionExecuted) {
          onDispositionExecuted({
            ...patient,
            ...updatePayload,
            status: newStatus
          });
        } else if (onReturnToConsole) {
          onReturnToConsole();
        }
      }, 700);
    } catch (err) {
      console.warn('Disposition execution warning:', err);
      if (onReturnToConsole) onReturnToConsole();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 font-serif text-black dark:text-[#f5f2eb]">
      
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
            ACTIVE EVALUATION DOCKET: {patient.id}
          </span>
          <div className="text-[10px] text-[#777777] dark:text-[#aaaaaa] mt-0.5">
            SOURCE: {patient.source || 'FIELD INTAKE'} • TRIAGE TIER: {patient.triage_priority || 'ROUTINE'}
          </div>
        </div>
      </div>

      {/* Protocol Toggles (Chunky Buttons) */}
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between font-sans font-black text-xs uppercase tracking-wider text-black dark:text-white">
          <span>STANDARDIZED EMERGENCY PROTOCOL TOGGLES:</span>
          <span className="text-[10px] text-[#777777] dark:text-[#aaaaaa]">CLICK TO TAG CASE &amp; INJECT CLINICAL CONTEXT</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {CLINICAL_PROTOCOLS.map((protocol) => {
            const isActive = selectedProtocolCode === protocol.code;
            return (
              <button
                key={protocol.code}
                type="button"
                onClick={() => handleToggleProtocol(protocol)}
                className={`p-3 text-left border-2 rounded-none transition-none cursor-pointer ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-[#F9F9F7] text-black dark:bg-[#181818] dark:text-white border-black dark:border-white hover:border-4'
                }`}
              >
                <div className="font-bold text-[10px] tracking-wider uppercase flex items-center justify-between">
                  <span>{protocol.code}</span>
                  {isActive && <span className="text-[8px] bg-white text-black dark:bg-black dark:text-white px-1 font-black">ACTIVE</span>}
                </div>
                <div className="text-xs font-black font-sans uppercase mt-1 leading-tight">
                  {protocol.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SPLIT-PANE LAYOUT: 70% LEFT ACTIVE DATA & 30% RIGHT STICKY ARCHIVE */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANE (70% WIDTH - 8.4 COLS -> col-span-8): ACTIVE CLINICAL DATA */}
        <section className="lg:col-span-8 border-2 border-black dark:border-white p-6 bg-[#F9F9F7] dark:bg-[#181818] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 rounded-none">
          
          {/* 1. Read-Only Demographics & Complaint (Heavy Bold Typography, No Inputs) */}
          <div className="border-b-2 border-black dark:border-white pb-4">
            <span className="font-sans font-black text-[10px] tracking-wider uppercase text-[#777777] dark:text-[#aaaaaa] block mb-1">
              PATIENT DEMOGRAPHICS &amp; GOVT IDENTIFIER (READ-ONLY TELEMETRY)
            </span>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h1 className="text-3xl md:text-4xl font-serif font-black text-black dark:text-white tracking-tight uppercase">
                  {patientName}
                </h1>
                <div className="font-sans font-bold text-sm text-[#555555] dark:text-[#cccccc] uppercase mt-0.5">
                  {patientAge} YRS • {patientGender} • DOCKET ID: <span className="font-mono text-black dark:text-white font-black">{patient.id}</span>
                </div>
              </div>

              <div className="font-mono text-xs bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 font-bold uppercase tracking-wider self-start">
                AADHAAR: {patientUid}
              </div>
            </div>
          </div>

          {/* 2. High-Density Vitals Matrix (Out-of-Bounds in Bold text-red-600) */}
          <div className="border-2 border-black dark:border-white bg-[#F4F2EC] dark:bg-[#1f1f1f] p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-2">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-1.5 font-sans font-black text-[10px] tracking-wider uppercase text-black dark:text-white">
              <span>HIGH-DENSITY PHYSIOLOGICAL VITALS MATRIX</span>
              <span className="font-mono text-[9px] bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 font-bold">
                CLINICAL THRESHOLDS ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {/* NIBP */}
              <div className={`p-2.5 rounded-none transition-none ${
                isSysAbnormal || isDiaAbnormal
                  ? 'border-2 border-[#CC0000] bg-[#FFF0F0] dark:bg-[#330000] text-red-600'
                  : 'border-2 border-black dark:border-white bg-white dark:bg-[#252525] text-black dark:text-white'
              }`}>
                <div className="flex items-center justify-between font-sans font-black text-[9px] tracking-wider uppercase">
                  <span>NIBP (SYS/DIA)</span>
                  {(isSysAbnormal || isDiaAbnormal) && (
                    <span className="bg-[#CC0000] text-white text-[7px] px-1 font-bold">ALERT</span>
                  )}
                </div>
                <div className="font-mono text-xl md:text-2xl font-black mt-1">
                  {sysBp}/{diaBp}
                </div>
                <span className="text-[8px] font-mono text-[#777777] dark:text-[#aaaaaa] block mt-0.5">mmHg</span>
              </div>

              {/* PULSE RATE */}
              <div className={`p-2.5 rounded-none transition-none ${
                isHrAbnormal
                  ? 'border-2 border-[#CC0000] bg-[#FFF0F0] dark:bg-[#330000] text-red-600'
                  : 'border-2 border-black dark:border-white bg-white dark:bg-[#252525] text-black dark:text-white'
              }`}>
                <div className="flex items-center justify-between font-sans font-black text-[9px] tracking-wider uppercase">
                  <span>HEART RATE</span>
                  {isHrAbnormal && (
                    <span className="bg-[#CC0000] text-white text-[7px] px-1 font-bold">ALERT</span>
                  )}
                </div>
                <div className="font-mono text-xl md:text-2xl font-black mt-1">
                  {hr}
                </div>
                <span className="text-[8px] font-mono text-[#777777] dark:text-[#aaaaaa] block mt-0.5">BPM</span>
              </div>

              {/* SPO2 */}
              <div className={`p-2.5 rounded-none transition-none ${
                isSpo2Abnormal
                  ? 'border-2 border-[#CC0000] bg-[#FFF0F0] dark:bg-[#330000] text-red-600'
                  : 'border-2 border-black dark:border-white bg-white dark:bg-[#252525] text-black dark:text-white'
              }`}>
                <div className="flex items-center justify-between font-sans font-black text-[9px] tracking-wider uppercase">
                  <span>SPO2 SAT</span>
                  {isSpo2Abnormal && (
                    <span className="bg-[#CC0000] text-white text-[7px] px-1 font-bold">HYPOXIC</span>
                  )}
                </div>
                <div className="font-mono text-xl md:text-2xl font-black mt-1">
                  {spo2}%
                </div>
                <span className="text-[8px] font-mono text-[#777777] dark:text-[#aaaaaa] block mt-0.5">% OXIMETRY</span>
              </div>

              {/* TEMPERATURE */}
              <div className={`p-2.5 rounded-none transition-none ${
                isTempAbnormal
                  ? 'border-2 border-[#CC0000] bg-[#FFF0F0] dark:bg-[#330000] text-red-600'
                  : 'border-2 border-black dark:border-white bg-white dark:bg-[#252525] text-black dark:text-white'
              }`}>
                <div className="flex items-center justify-between font-sans font-black text-[9px] tracking-wider uppercase">
                  <span>BODY TEMP</span>
                  {isTempAbnormal && (
                    <span className="bg-[#CC0000] text-white text-[7px] px-1 font-bold">FEVER</span>
                  )}
                </div>
                <div className="font-mono text-xl md:text-2xl font-black mt-1">
                  {temp}°F
                </div>
                <span className="text-[8px] font-mono text-[#777777] dark:text-[#aaaaaa] block mt-0.5">THERMAL</span>
              </div>

              {/* GCS */}
              <div className={`p-2.5 rounded-none transition-none ${
                isGcsAbnormal
                  ? 'border-2 border-[#CC0000] bg-[#FFF0F0] dark:bg-[#330000] text-red-600'
                  : 'border-2 border-black dark:border-white bg-white dark:bg-[#252525] text-black dark:text-white'
              }`}>
                <div className="flex items-center justify-between font-sans font-black text-[9px] tracking-wider uppercase">
                  <span>GCS SCALE</span>
                  {isGcsAbnormal && (
                    <span className="bg-[#CC0000] text-white text-[7px] px-1 font-bold">DEFICIT</span>
                  )}
                </div>
                <div className="font-mono text-xl md:text-2xl font-black mt-1">
                  {gcs}/15
                </div>
                <span className="text-[8px] font-mono text-[#777777] dark:text-[#aaaaaa] block mt-0.5">NEURO</span>
              </div>
            </div>
          </div>

          {/* 3. Solid Read-Only Chief Presentation Narrative */}
          <div className="p-5 md:p-6 bg-white dark:bg-[#222222] border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-1.5">
            <div className="flex items-center justify-between font-sans font-black text-[10px] tracking-wider uppercase text-[#777777] dark:text-[#aaaaaa]">
              <span>CHIEF COMPLAINT &amp; PRESENTING CLINICAL NARRATIVE</span>
              <span className="font-mono">{complaintText.length} CHARACTERS</span>
            </div>
            <p className="font-mono text-sm md:text-base font-bold text-black dark:text-white leading-relaxed">
              {complaintText}
            </p>
          </div>

          {/* 4. Embedded Prescription & Diagnostic Order Module (NEW) */}
          <PrescriptionModule
            prescriptions={prescriptions}
            diagnosticTests={diagnosticTests}
            onChange={({ prescriptions: newRx, diagnosticTests: newTests }) => {
              setPrescriptions(newRx);
              setDiagnosticTests(newTests);
            }}
          />

          {/* 5. Triage Verdict Action Bar (3 Massive Action Buttons) */}
          <div className="border-t-4 border-black dark:border-white pt-5 space-y-3">
            <div className="font-sans font-black text-xs uppercase tracking-wider text-black dark:text-white flex items-center justify-between">
              <span>EXECUTE IMMEDIATE CLINICAL DISPOSITION:</span>
              {decisionFeedback && (
                <span className="font-mono text-xs font-bold text-black dark:text-white bg-[#EAE8E2] dark:bg-[#333333] px-2.5 py-1 border border-black dark:border-white">
                  {decisionFeedback}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono font-bold text-xs uppercase">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleExecuteVerdict('DISPATCH', 'Immediate 108 ALS Ambulance dispatched for tertiary hospital emergency transfer.')}
                className="w-full py-4 px-3 bg-[#CC0000] text-white hover:bg-[#AA0000] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-center rounded-none cursor-pointer tracking-wider"
              >
                [ 🟥 DISPATCH AMBULANCE ]
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleExecuteVerdict('ADMIT', 'Admit patient directly to CHC Inpatient Stabilization Ward. Initiate IV fluids, diagnostics, and continuous observation.')}
                className="w-full py-4 px-3 bg-[#E5A000] text-black hover:bg-[#CC8800] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-center rounded-none cursor-pointer tracking-wider"
              >
                [ 🟨 ADMIT TO WARD ]
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleExecuteVerdict('DISCHARGE', 'Outpatient clinical evaluation completed. Digital prescription and supportive guidance issued. Cleared for home discharge.')}
                className="w-full py-4 px-3 bg-[#008844] text-white hover:bg-[#006633] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-center rounded-none cursor-pointer tracking-wider"
              >
                [ 🟩 PRESCRIBE &amp; DISCHARGE ]
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT PANE (30% WIDTH - 3.6 COLS -> col-span-4, STICKY): PATIENT ARCHIVE */}
        <aside className="lg:col-span-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto border-2 border-black dark:border-white p-5 bg-white dark:bg-[#181818] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5 rounded-none">
          
          {/* Masthead */}
          <div className="border-b-2 border-black dark:border-white pb-2 font-mono">
            <span className="step-badge">ARCHIVE</span>
            <h3 className="font-serif font-black text-base uppercase inline ml-2 text-black dark:text-white">
              Patient Dossier &amp; Visit History
            </h3>
            <div className="text-[10px] text-[#777777] dark:text-[#aaaaaa] mt-0.5">
              IMMUTABLE CLINICAL REGISTRY (LOCKED IN VIEWPORT)
            </div>
          </div>

          {/* 1. Chronic Comorbidities */}
          <div className="border-2 border-black dark:border-white p-3.5 bg-[#F9F9F7] dark:bg-[#222222] space-y-1">
            <span className="font-sans font-black text-[9px] uppercase text-[#777777] dark:text-[#aaaaaa] block">
              CHRONIC COMORBIDITIES &amp; SURGICAL HISTORY
            </span>
            <div className="font-mono text-xs font-bold text-black dark:text-white leading-relaxed">
              {historyText}
            </div>
          </div>

          {/* 2. Target Specialty Recommendation */}
          <div className="border-2 border-black dark:border-white p-3.5 bg-[#F9F9F7] dark:bg-[#222222]">
            <span className="font-sans font-black text-[9px] uppercase text-[#777777] dark:text-[#aaaaaa] block mb-1">
              TARGET SPECIALTY &amp; REFERRAL TIER
            </span>
            <div className="font-serif font-bold text-sm text-black dark:text-white">
              {patient.suggested_specialist || patient.clinical_data?.suggested_specialist || 'District Hospital / Community Health Centre'}
            </div>
          </div>

          {/* 3. Historical Visits Timeline */}
          <div className="space-y-2">
            <span className="font-sans font-black text-[10px] uppercase text-black dark:text-white block border-b-2 border-black dark:border-white pb-1">
              HISTORICAL VISITS &amp; PREVIOUS DOCKETS
            </span>

            <div className="space-y-2.5 font-mono text-[11px]">
              {MOCK_HISTORICAL_VISITS.map((visit, idx) => (
                <div key={idx} className="border-2 border-[#CCCCCC] dark:border-[#333333] p-2.5 bg-[#F9F9F7] dark:bg-[#222222] space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-bold text-[#777777] dark:text-[#aaaaaa]">
                    <span>{visit.date}</span>
                    <span className="bg-black dark:bg-white text-white dark:text-black px-1">{visit.facility}</span>
                  </div>
                  <div className="font-sans font-bold text-xs text-black dark:text-white">
                    {visit.diagnosis}
                  </div>
                  <div className="text-[10px] text-[#555555] dark:text-[#aaaaaa] flex items-center justify-between">
                    <span>{visit.doctor}</span>
                    <span className="text-[#008844] font-bold">✓ {visit.outcome}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copy Summary Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const rxSummary = prescriptions.map((r) => `${r.medication} (${r.dosage} ${r.frequency})`).join(', ');
                navigator.clipboard.writeText(`DOCKET [${patient.id}]: ${patientName} (${patientAge}/${patientGender}) - ${complaintText} | Prescribed: ${rxSummary || 'None'}`);
                setDecisionFeedback('✓ COPIED DOCKET SUMMARY TO CLIPBOARD');
                setTimeout(() => setDecisionFeedback(null), 2500);
              }}
              className="btn-secondary w-full py-2 text-xs font-mono font-bold uppercase border-2 border-black dark:border-white rounded-none cursor-pointer"
            >
              [ 📋 COPY DOCKET SUMMARY ]
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
