import React, { useState, useEffect, useCallback } from 'react';
import CommandQueue from '../components/CommandQueue';
import TriageDocket from '../components/TriageDocket';
import WalkInIntake from '../components/WalkInIntake';
import {
  fetchPaginatedPatients,
  fetchAuditLogs,
  acknowledgeTriageRecord,
  escalateTriageRecord
} from '../services/supabaseService';
import { startEmergencyAlarm, stopEmergencyAlarm } from '../services/audioAlert';
import { subscribeToTriageUpdates } from '../services/socket';

export default function DoctorDashboard() {
  // Navigation View State: 'QUEUE' (View A) | 'DOCKET' (View B) | 'WALK_IN' (View C)
  const [activeView, setActiveView] = useState('QUEUE');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Queue & Pagination State
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('all');

  // Admitted Observation Bed Queue
  const [localFacilityQueue, setLocalFacilityQueue] = useState([
    {
      bed: 'BED-01 (INPATIENT WARD)',
      patient_name: 'Dinesh Chandra',
      age_gender: '48 YRS / MALE',
      aadhaar: 'XXXX-XXXX-3891',
      arrival_time: '11:15 AM',
      chief_complaint: 'Acute Exacerbation of COPD, post-bronchodilator observation.',
      vitals_summary: 'BP: 138/88 | HR: 88 | SpO2: 95%',
      status: 'ADMITTED_OBSERVATION',
      urgency: 'High'
    },
    {
      bed: 'BED-02 (INPATIENT WARD)',
      patient_name: 'Sunita Devi',
      age_gender: '34 YRS / FEMALE',
      aadhaar: 'XXXX-XXXX-9142',
      arrival_time: '11:40 AM',
      chief_complaint: 'Severe Acute Dehydration secondary to Acute Gastroenteritis.',
      vitals_summary: 'BP: 100/65 | HR: 98 | SpO2: 97%',
      status: 'ADMITTED_OBSERVATION',
      urgency: 'High'
    }
  ]);

  // SLA Countdown & Escalation Tracking
  const [activeSlaSeconds, setActiveSlaSeconds] = useState(180);
  const [isSlaBreached, setIsSlaBreached] = useState(false);
  const [escalatedCases, setEscalatedCases] = useState(() => new Set());
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Fetch paginated patient queue from backend/Supabase
  const loadQueueData = useCallback(async (page = 1, search = '', urgency = 'all') => {
    setLoading(true);
    try {
      const response = await fetchPaginatedPatients({
        page,
        limit: 15,
        search,
        urgency: urgency === 'all' ? '' : urgency
      });

      if (response && response.data) {
        setPatients(response.data);
        if (response.pagination) {
          setCurrentPage(response.pagination.page || page);
          setTotalPages(response.pagination.totalPages || 1);
          setTotalRecords(response.pagination.total || response.data.length);
        }
      }
    } catch (err) {
      console.warn('Queue data load warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadQueueData(currentPage, searchQuery, filterUrgency);
  }, [currentPage, filterUrgency, loadQueueData]);

  // Handle Search Input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadQueueData(1, searchQuery, filterUrgency);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, filterUrgency, loadQueueData]);

  // Subscribe to real-time WebSocket events
  useEffect(() => {
    const unsubscribe = subscribeToTriageUpdates((event) => {
      console.log('⚡ [Doctor Dashboard]: Real-time event received:', event.type);
      loadQueueData(currentPage, searchQuery, filterUrgency);

      if (event.type === 'EMERGENCY_ALERT' || event.type === 'CRITICAL_SLA_BREACH') {
        if (!isAudioMuted) {
          startEmergencyAlarm();
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      stopEmergencyAlarm();
    };
  }, [currentPage, searchQuery, filterUrgency, isAudioMuted, loadQueueData]);

  // Find unacknowledged critical cases in queue for 3-minute SLA monitor
  const unacknowledgedCritical = patients.find(
    (p) =>
      (p.triage_priority === 'CRITICAL' || p.ai_urgency_score === 'Critical') &&
      !p.acknowledged_at &&
      p.status !== 'ACKNOWLEDGED_BY_DOCTOR'
  );

  // 3-Minute Critical SLA Countdown Engine
  useEffect(() => {
    if (!unacknowledgedCritical) {
      setIsSlaBreached(false);
      stopEmergencyAlarm();
      return;
    }

    const createdTime = new Date(unacknowledgedCritical.created_at || Date.now()).getTime();
    const slaLimitMs = 180 * 1000; // 3 minutes

    const slaInterval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - createdTime;
      const remainingSec = Math.max(0, Math.floor((slaLimitMs - elapsedMs) / 1000));
      setActiveSlaSeconds(remainingSec);

      if (remainingSec === 0) {
        setIsSlaBreached(true);
        if (!isAudioMuted) {
          startEmergencyAlarm();
        }

        if (!escalatedCases.has(unacknowledgedCritical.id)) {
          setEscalatedCases((prev) => new Set([...prev, unacknowledgedCritical.id]));
          escalateTriageRecord(unacknowledgedCritical.id);
        }
      }
    }, 1000);

    return () => clearInterval(slaInterval);
  }, [unacknowledgedCritical, escalatedCases, isAudioMuted]);

  // Dismiss Local Patient from admitted bed ward
  const handleDischargeLocalPatient = (patientName) => {
    setLocalFacilityQueue((prev) => prev.filter((p) => p.patient_name !== patientName));
  };

  // Open Active Evaluation Docket for a Patient (View B)
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setActiveView('DOCKET');
    stopEmergencyAlarm();
  };

  // Open Direct Walk-In Registration (View C)
  const handleOpenWalkIn = () => {
    setActiveView('WALK_IN');
  };

  // Walk-In Registered Callback -> Immediate handoff to View B (Triage Docket)
  const handleWalkInRegistered = (newPatient) => {
    setSelectedPatient(newPatient);
    setActiveView('DOCKET');
    loadQueueData(1, '', 'all');
  };

  // Triage Disposition Executed Callback
  const handleDispositionExecuted = (updatedPatient) => {
    stopEmergencyAlarm();
    setIsSlaBreached(false);

    // If admitted to ward, allocate bed in Local Facility Queue
    if (updatedPatient.status === 'ADMITTED') {
      const pName = updatedPatient.name || updatedPatient.patient_name || 'Admitted Casualty';
      const pAge = updatedPatient.age || '45';
      const pGender = updatedPatient.gender || 'MALE';
      const pUid = updatedPatient.patient_uid || 'XXXX-XXXX-XXXX';
      const v = updatedPatient.vitals || {};
      const vitalsStr = `BP: ${v.bp || '120/80'} | HR: ${v.hr || v.pulse || '75'} | SpO2: ${v.spo2 || v.spO2 || '98'}%`;

      const newBedEntry = {
        bed: `BED-0${Math.floor(1 + Math.random() * 8)} (INPATIENT WARD)`,
        patient_name: pName,
        age_gender: `${pAge} YRS / ${pGender}`,
        aadhaar: pUid,
        arrival_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chief_complaint: updatedPatient.complaint || 'Admitted for stabilization and observation.',
        vitals_summary: vitalsStr,
        status: 'ADMITTED_OBSERVATION',
        urgency: 'High'
      };

      setLocalFacilityQueue((prev) => [newBedEntry, ...prev.filter((p) => p.patient_name !== pName)]);
    }

    // Refresh queue and return to View A
    loadQueueData(currentPage, searchQuery, filterUrgency);
    setActiveView('QUEUE');
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#121212] text-black dark:text-[#f5f2eb] font-serif transition-colors duration-150">
      
      {/* 3-MINUTE CRITICAL SLA COUNTDOWN BANNER */}
      {unacknowledgedCritical && (
        <div className={`w-full border-b-4 border-black dark:border-white p-3 font-mono text-xs font-bold transition-all ${
          isSlaBreached
            ? 'bg-[#CC0000] text-white animate-pulse'
            : 'bg-[#FFCC00] text-black'
        }`}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{isSlaBreached ? '🚨' : '⏱️'}</span>
              <span className="uppercase tracking-wider">
                {isSlaBreached
                  ? `[CRITICAL SLA BREACH]: CASE ${unacknowledgedCritical.id} EXCEEDED 3-MIN ACKNOWLEDGMENT WINDOW! 108 DISPATCH NOTIFIED.`
                  : `[CRITICAL CASE PENDING]: CASE ${unacknowledgedCritical.id} (${unacknowledgedCritical.name || 'EMERGENCY'}) REQUIRES IMMEDIATE ACKNOWLEDGMENT.`}
              </span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {!isSlaBreached && (
                <div className="bg-black text-white px-2.5 py-0.5 font-mono font-black text-sm">
                  {Math.floor(activeSlaSeconds / 60)}:{(activeSlaSeconds % 60).toString().padStart(2, '0')} REMAINING
                </div>
              )}

              <button
                type="button"
                onClick={() => handleSelectPatient(unacknowledgedCritical)}
                className="bg-black text-white dark:bg-white dark:text-black px-3 py-1 text-[11px] font-black uppercase border border-black dark:border-white rounded-none cursor-pointer"
              >
                [ EVALUATE CASE NOW &gt; ]
              </button>

              <button
                type="button"
                onClick={() => {
                  stopEmergencyAlarm();
                  setIsAudioMuted((prev) => !prev);
                }}
                className="border border-black dark:border-white px-2 py-1 text-[10px] uppercase font-bold"
              >
                {isAudioMuted ? '🔇 UNMUTE' : '🔊 MUTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* VIEW ROUTING (STRICT ISOLATION - NO COMPONENT BLEED)                   */}
      {/* ======================================================================= */}
      
      {/* VIEW A: THE COMMAND CONSOLE QUEUE (DEFAULT DASHBOARD) */}
      {activeView === 'QUEUE' && (
        <CommandQueue
          patients={patients}
          localFacilityQueue={localFacilityQueue}
          currentPage={currentPage}
          totalPages={totalPages}
          searchQuery={searchQuery}
          filterUrgency={filterUrgency}
          loading={loading}
          onSearchChange={setSearchQuery}
          onFilterChange={(urgency) => {
            setFilterUrgency(urgency);
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
          onSelectPatient={handleSelectPatient}
          onOpenWalkIn={handleOpenWalkIn}
          onDischargeLocalPatient={handleDischargeLocalPatient}
        />
      )}

      {/* VIEW B: ACTIVE PATIENT EVALUATION (SPLIT-PANE TRIAGE DOCKET) */}
      {activeView === 'DOCKET' && selectedPatient && (
        <TriageDocket
          patient={selectedPatient}
          onReturnToConsole={() => setActiveView('QUEUE')}
          onDispositionExecuted={handleDispositionExecuted}
        />
      )}

      {/* VIEW C: DIRECT WALK-IN CASUALTY REGISTRATION */}
      {(activeView === 'WALK_IN') && (
        <div className="px-4 py-6">
          <WalkInIntake
            onReturnToConsole={() => setActiveView('QUEUE')}
            onPatientRegistered={handleWalkInRegistered}
          />
        </div>
      )}
    </div>
  );
}
