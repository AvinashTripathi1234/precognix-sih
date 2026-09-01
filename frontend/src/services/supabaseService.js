import { supabase, isSupabaseConfigured } from './supabase';
import { enqueueOfflineDocket } from './offlineQueue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Local in-memory store for fallback/instant UI reactivity
let localTriageRecords = [
  {
    id: 'TR-8841',
    created_at: new Date(Date.now() - 1000 * 60 * 2.5).toISOString(),
    symptoms_text: 'Crushing chest pain radiating to left arm and jaw, severe diaphoresis for 45 minutes.',
    ai_urgency_score: 'Critical',
    aadhaar_number: '548291038471',
    medical_history: 'Hypertension (5 yrs), Type 2 Diabetes, Past Stent (2023)',
    clinical_data: {
      patient_name: 'Ramesh Kumar',
      patient_age: '52 yrs, Male',
      aadhaar_number: '548291038471',
      suggested_specialist: 'District Hospital (Cardiology/ICU)',
      immediate_action: 'Immediate 108 ambulance transfer in semi-sitting position.',
      medical_history: 'Hypertension (5 yrs), Type 2 Diabetes, Past Stent (2023)',
      vitals: { bp: '160/100', pulse: '112', spO2: '91', temperature: '98.4' },
      gcs: '15'
    },
    referred_facility_name: 'BRD Medical College, Gorakhpur',
    referred_facility_id: 1,
    status: 'DISPATCHED',
    acknowledged_by: null,
    acknowledged_at: null
  },
  {
    id: 'TR-8840',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    symptoms_text: 'Farmer bitten by unidentified snake on right foot, rapidly ascending edema.',
    ai_urgency_score: 'Critical',
    aadhaar_number: '891047281934',
    medical_history: 'No chronic illness. Bitten during harvest.',
    clinical_data: {
      patient_name: 'Shyam Sundar',
      patient_age: '30 yrs, Male',
      aadhaar_number: '891047281934',
      suggested_specialist: 'District Hospital / Trauma Centre (Toxicology)',
      immediate_action: 'Immobilize lower extremity, arrange urgent antivenom therapy.',
      medical_history: 'No chronic illness. Bitten during harvest.',
      vitals: { bp: '95/60', pulse: '124', spO2: '94', temperature: '99.0' },
      gcs: '15'
    },
    referred_facility_name: 'Gorakhpur Main District Hospital',
    referred_facility_id: 2,
    status: 'DISPATCHED',
    acknowledged_by: 'DR_ANAND_VERMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 16).toISOString()
  },
  {
    id: 'TR-8839',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    symptoms_text: 'Acute onset unilateral hemiplegia, severe facial droop, and expressive aphasia.',
    ai_urgency_score: 'Critical',
    aadhaar_number: '920148291048',
    medical_history: 'Severe Hypertension, Atrial Fibrillation',
    clinical_data: {
      patient_name: 'Radha Mohan',
      patient_age: '68 yrs, Male',
      aadhaar_number: '920148291048',
      suggested_specialist: 'Tertiary Hospital (Neurology / Stroke Unit)',
      immediate_action: '108 ALS transfer for CT angiography & thrombolysis evaluation.',
      medical_history: 'Severe Hypertension, Atrial Fibrillation',
      vitals: { bp: '195/115', pulse: '88', spO2: '95', temperature: '98.4' },
      gcs: '11'
    },
    referred_facility_name: 'BRD Medical College, Gorakhpur',
    referred_facility_id: 1,
    status: 'DISPATCHED',
    acknowledged_by: null,
    acknowledged_at: null
  },
  {
    id: 'TR-8838',
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    symptoms_text: 'Marked pediatric respiratory distress with suprasternal retractions, audible stridor.',
    ai_urgency_score: 'Critical',
    aadhaar_number: '746192048192',
    medical_history: 'Childhood Asthma, recurrent wheezing attacks',
    clinical_data: {
      patient_name: 'Aarav Gupta',
      patient_age: '3 yrs, Male',
      aadhaar_number: '746192048192',
      suggested_specialist: 'District Hospital (Pediatric ICU)',
      immediate_action: 'High-flow humidified oxygen, nebulized Salbutamol + Budesonide.',
      medical_history: 'Childhood Asthma, recurrent wheezing attacks',
      vitals: { bp: '90/60', pulse: '145', spO2: '88', temperature: '102.1' },
      gcs: '13-14'
    },
    referred_facility_name: 'Gorakhpur Main District Hospital',
    referred_facility_id: 2,
    status: 'DISPATCHED',
    acknowledged_by: null,
    acknowledged_at: null
  },
  {
    id: 'TR-8837',
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    symptoms_text: 'Continuous high fever (103°F) for 3 days with intense chills and dark urine.',
    ai_urgency_score: 'High',
    aadhaar_number: '381920471928',
    medical_history: 'Tuberculosis (completed DOTS therapy 2 years ago)',
    clinical_data: {
      patient_name: 'Pooja Devi',
      patient_age: '24 yrs, Female',
      aadhaar_number: '381920471928',
      suggested_specialist: 'Community Health Centre (General Medicine)',
      immediate_action: 'Cold tepid sponge, oral rehydration, blood smear for malaria.',
      medical_history: 'Tuberculosis (completed DOTS therapy 2 years ago)',
      vitals: { bp: '110/70', pulse: '104', spO2: '97', temperature: '103.2' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'REFERRED',
    acknowledged_by: 'DR_PRIYA_SHARMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 70).toISOString()
  },
  {
    id: 'TR-8836',
    created_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    symptoms_text: 'Severe diabetic foot ulcer with localized cellulitis and foul-smelling discharge.',
    ai_urgency_score: 'High',
    aadhaar_number: '610283941092',
    medical_history: 'Type 2 Diabetes (12 yrs, uncontrolled), Peripheral Neuropathy',
    clinical_data: {
      patient_name: 'Mohammad Rafiq',
      patient_age: '58 yrs, Male',
      aadhaar_number: '610283941092',
      suggested_specialist: 'District Hospital (Surgical Debridement & Endocrinology)',
      immediate_action: 'Sterile dressing, initiate IV broad-spectrum antibiotics and sliding scale insulin.',
      medical_history: 'Type 2 Diabetes (12 yrs, uncontrolled), Peripheral Neuropathy',
      vitals: { bp: '138/88', pulse: '96', spO2: '96', temperature: '100.8' },
      gcs: '15'
    },
    referred_facility_name: 'Gorakhpur Main District Hospital',
    referred_facility_id: 2,
    status: 'REFERRED',
    acknowledged_by: 'DR_ANAND_VERMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 90).toISOString()
  },
  {
    id: 'TR-8835',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    symptoms_text: 'Acute obstetrical labour, 38 weeks gestation, severe pre-eclamptic headache.',
    ai_urgency_score: 'High',
    aadhaar_number: '492019385710',
    medical_history: 'Primigravida, Gestational Hypertension diagnosed at 32 weeks',
    clinical_data: {
      patient_name: 'Savita Nishad',
      patient_age: '22 yrs, Female',
      aadhaar_number: '492019385710',
      suggested_specialist: 'First Referral Unit (FRU) / CHC Maternity OT',
      immediate_action: 'Administer loading dose Magnesium Sulphate, urgent delivery readiness.',
      medical_history: 'Primigravida, Gestational Hypertension diagnosed at 32 weeks',
      vitals: { bp: '165/105', pulse: '98', spO2: '98', temperature: '98.6' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'DISPATCHED',
    acknowledged_by: 'DR_PRIYA_SHARMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 115).toISOString()
  },
  {
    id: 'TR-8834',
    created_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    symptoms_text: 'Persistent productive cough for 4 weeks with hemoptysis and night sweats.',
    ai_urgency_score: 'Moderate',
    aadhaar_number: '209384719203',
    medical_history: 'Heavy bidi smoking history (20 pack years)',
    clinical_data: {
      patient_name: 'Chhote Lal',
      patient_age: '49 yrs, Male',
      aadhaar_number: '209384719203',
      suggested_specialist: 'PHC / DOTS Tuberculosis Microscopy Center',
      immediate_action: 'Collect spot sputum for CBNAAT / GeneXpert, provide surgical mask.',
      medical_history: 'Heavy bidi smoking history (20 pack years)',
      vitals: { bp: '124/80', pulse: '82', spO2: '95', temperature: '99.4' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'RESOLVED',
    acknowledged_by: 'DR_ANAND_VERMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 140).toISOString()
  },
  {
    id: 'TR-8833',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    symptoms_text: 'Right upper quadrant colicky pain post fatty meal, mild scleral icterus.',
    ai_urgency_score: 'Moderate',
    aadhaar_number: '847192038471',
    medical_history: 'Known Gallbladder Stones (Cholelithiasis)',
    clinical_data: {
      patient_name: 'Rekha Maurya',
      patient_age: '41 yrs, Female',
      aadhaar_number: '847192038471',
      suggested_specialist: 'CHC General Surgery & Ultrasonography',
      immediate_action: 'NPO (nil by mouth), IV antispasmodics, schedule ultrasound abdomen.',
      medical_history: 'Known Gallbladder Stones (Cholelithiasis)',
      vitals: { bp: '130/84', pulse: '84', spO2: '98', temperature: '98.8' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'RESOLVED',
    acknowledged_by: 'DR_PRIYA_SHARMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 175).toISOString()
  },
  {
    id: 'TR-8832',
    created_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    symptoms_text: 'Mild upper respiratory tract rhinorrhea, non-productive dry cough for 1 day.',
    ai_urgency_score: 'Low',
    aadhaar_number: '482019384920',
    medical_history: 'No chronic diseases recorded.',
    clinical_data: {
      patient_name: 'Sunita Sharma',
      patient_age: '35 yrs, Female',
      aadhaar_number: '482019384920',
      suggested_specialist: 'Health & Wellness Centre (HWC) / ASHA Home Care',
      immediate_action: 'Steam inhalation, warm saline gargles, oral Cetirizine 10mg.',
      medical_history: 'No chronic diseases recorded.',
      vitals: { bp: '120/80', pulse: '72', spO2: '99', temperature: '98.6' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'RESOLVED',
    acknowledged_by: 'DR_ANAND_VERMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 200).toISOString()
  },
  {
    id: 'TR-8831',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    symptoms_text: 'Closed radius fracture post slip on wet mud, intact distal neurovascular pulse.',
    ai_urgency_score: 'Moderate',
    aadhaar_number: '918273645019',
    medical_history: 'Osteoporosis on Calcium/Vitamin D supplementation',
    clinical_data: {
      patient_name: 'Brijesh Pandey',
      patient_age: '63 yrs, Male',
      aadhaar_number: '918273645019',
      suggested_specialist: 'CHC Orthopaedic Department / X-Ray Unit',
      immediate_action: 'Immobilize with forearm splint, elevate limb, arrange X-Ray wrist.',
      medical_history: 'Osteoporosis on Calcium/Vitamin D supplementation',
      vitals: { bp: '136/82', pulse: '78', spO2: '98', temperature: '98.4' },
      gcs: '15'
    },
    referred_facility_name: 'Gorakhpur Main District Hospital',
    referred_facility_id: 2,
    status: 'RESOLVED',
    acknowledged_by: 'DR_ANAND_VERMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 230).toISOString()
  },
  {
    id: 'TR-8830',
    created_at: new Date(Date.now() - 1000 * 60 * 280).toISOString(),
    symptoms_text: 'Acute watery diarrhea 6 episodes in 12 hours, mild sunken eyes, thirsty.',
    ai_urgency_score: 'Moderate',
    aadhaar_number: '102938475610',
    medical_history: 'None',
    clinical_data: {
      patient_name: 'Manju Devi',
      patient_age: '29 yrs, Female',
      aadhaar_number: '102938475610',
      suggested_specialist: 'Primary Health Centre (PHC)',
      immediate_action: 'Administer WHO Oral Rehydration Salts (ORS) solution + Zinc 20mg.',
      medical_history: 'None',
      vitals: { bp: '105/68', pulse: '92', spO2: '99', temperature: '98.8' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'RESOLVED',
    acknowledged_by: 'DR_PRIYA_SHARMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 270).toISOString()
  },
  {
    id: 'TR-8829',
    created_at: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
    symptoms_text: 'Superficial skin abrasion right knee post bicycle fall, clean wound edges.',
    ai_urgency_score: 'Low',
    aadhaar_number: '718293049182',
    medical_history: 'Tetanus toxoid received 8 months ago',
    clinical_data: {
      patient_name: 'Vikram Singh',
      patient_age: '16 yrs, Male',
      aadhaar_number: '718293049182',
      suggested_specialist: 'Health & Wellness Centre (HWC)',
      immediate_action: 'Clean with normal saline, apply Povidone Iodine 5% ointment and sterile dressing.',
      medical_history: 'Tetanus toxoid received 8 months ago',
      vitals: { bp: '115/75', pulse: '74', spO2: '99', temperature: '98.4' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'RESOLVED',
    acknowledged_by: 'DR_ANAND_VERMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 310).toISOString()
  },
  {
    id: 'TR-8828',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    symptoms_text: 'Severe acute lumbar back pain radiating to left sciatica, unable to bend.',
    ai_urgency_score: 'Moderate',
    aadhaar_number: '394810293847',
    medical_history: 'Lumbago, chronic manual field labor',
    clinical_data: {
      patient_name: 'Ramphal Yadav',
      patient_age: '55 yrs, Male',
      aadhaar_number: '394810293847',
      suggested_specialist: 'CHC Physiotherapy & Orthopaedics',
      immediate_action: 'Firm mattress rest, hot fomentation, oral NSAID and muscle relaxant.',
      medical_history: 'Lumbago, chronic manual field labor',
      vitals: { bp: '134/86', pulse: '80', spO2: '98', temperature: '98.6' },
      gcs: '15'
    },
    referred_facility_name: 'Kauriram Community Health Centre (CHC)',
    referred_facility_id: 3,
    status: 'RESOLVED',
    acknowledged_by: 'DR_ANAND_VERMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 350).toISOString()
  },
  {
    id: 'TR-8827',
    created_at: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
    symptoms_text: 'Foreign body sensation in left eye post threshing grain, mild erythema.',
    ai_urgency_score: 'Moderate',
    aadhaar_number: '501928374650',
    medical_history: 'No past ocular conditions',
    clinical_data: {
      patient_name: 'Kamla Devi',
      patient_age: '46 yrs, Female',
      aadhaar_number: '501928374650',
      suggested_specialist: 'District Hospital Ophthalmology Unit',
      immediate_action: 'Copious normal saline eye flush, avoid rubbing eye, apply eye patch.',
      medical_history: 'No past ocular conditions',
      vitals: { bp: '128/80', pulse: '76', spO2: '99', temperature: '98.4' },
      gcs: '15'
    },
    referred_facility_name: 'Gorakhpur Main District Hospital',
    referred_facility_id: 2,
    status: 'RESOLVED',
    acknowledged_by: 'DR_PRIYA_SHARMA',
    acknowledged_at: new Date(Date.now() - 1000 * 60 * 390).toISOString()
  }
];

export function parseAvailableServices(services) {
  if (!services) return [];

  if (Array.isArray(services)) {
    return services
      .map((s) => (typeof s === 'string' ? s.trim() : JSON.stringify(s)))
      .filter(Boolean);
  }

  if (typeof services === 'string') {
    const trimmed = services.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseAvailableServices(parsed);
      } catch {}
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof services === 'object') {
    return Object.entries(services)
      .filter(([_, val]) => val === true || val === 'true' || val === 1)
      .map(([key]) => key.trim());
  }

  return [];
}

/**
 * Inserts AI-generated triage assessment data into 'triage_records' table.
 * Automatically buffers into offline IndexedDB queue if device is offline.
 */
export async function insertTriageRecord(triageData) {
  const rawHistory = triageData.medical_history || triageData.medicalHistory || '';
  const formattedHistory = Array.isArray(rawHistory)
    ? rawHistory.join(', ')
    : typeof rawHistory === 'string'
    ? rawHistory.trim()
    : '';

  const cleanAadhaar = triageData.aadhaar_number
    ? String(triageData.aadhaar_number).replace(/\s+/g, '')
    : '';

  const recordObj = {
    id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
    created_at: new Date().toISOString(),
    symptoms_text: triageData.symptoms || triageData.symptoms_text || '',
    ai_urgency_score: triageData.urgency_score || triageData.ai_urgency_score || 'Moderate',
    aadhaar_number: cleanAadhaar,
    medical_history: formattedHistory,
    clinical_data: {
      suggested_specialist: triageData.suggested_specialist || 'Emergency Medical Officer',
      immediate_action: triageData.immediate_action || 'Admit and evaluate.',
      patient_name: triageData.patient_name || 'WALK-IN PATIENT',
      patient_age: triageData.patient_age || '',
      aadhaar_number: cleanAadhaar,
      medical_history: formattedHistory,
      vitals: triageData.vitals || null,
      gcs: triageData.gcs || null,
      recorded_by: 'Emergency Medical Officer / ASHA',
      client_timestamp: new Date().toISOString(),
    },
    status: triageData.status || (triageData.urgency_score === 'Critical' ? 'EMERGENCY_DISPATCH' : triageData.urgency_score === 'High' ? 'ADMITTED' : 'DISCHARGED'),
    referred_facility_id: triageData.referred_facility_id ? Number(triageData.referred_facility_id) : null,
    patient_id: triageData.patient_id || null,
    acknowledged_by: null,
    acknowledged_at: null
  };

  // Add to local in-memory reactivity buffer
  localTriageRecords = [recordObj, ...localTriageRecords.filter((r) => r.id !== recordObj.id)];

  // 1. Post to Express Backend API (/api/patients)
  try {
    const res = await fetch(`${API_BASE_URL}/api/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'CHC_DOCTOR'
      },
      body: JSON.stringify({
        ...triageData,
        symptoms_text: recordObj.symptoms_text,
        ai_urgency_score: recordObj.ai_urgency_score,
        aadhaar_number: cleanAadhaar,
        medical_history: formattedHistory,
        status: recordObj.status
      })
    });

    if (res.ok) {
      const json = await res.json();
      const saved = json.record || json.data || recordObj;
      localTriageRecords = [saved, ...localTriageRecords.filter((r) => r.id !== saved.id)];
      return { data: saved, error: null };
    }
  } catch (backendErr) {
    console.warn('⚠️ [Backend POST /api/patients Notice]:', backendErr.message);
  }

  // 2. If offline, enqueue to IndexedDB immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('📡 [Offline Queue]: Device offline. Queuing docket to IndexedDB...');
    await enqueueOfflineDocket(recordObj);
    return { data: recordObj, error: null, offlineQueued: true };
  }

  return { data: recordObj, error: null };
}

/**
 * Updates an existing triage/patient record in Supabase & local cache.
 */
export async function updateTriageRecord(id, updates) {
  const idx = localTriageRecords.findIndex((r) => String(r.id) === String(id));
  if (idx !== -1) {
    localTriageRecords[idx] = {
      ...localTriageRecords[idx],
      ...updates,
      clinical_data: {
        ...localTriageRecords[idx].clinical_data,
        ...updates.clinical_data,
        patient_name: updates.patient_name || localTriageRecords[idx].clinical_data?.patient_name,
        patient_age: updates.patient_age || localTriageRecords[idx].clinical_data?.patient_age,
        aadhaar_number: updates.aadhaar_number || localTriageRecords[idx].clinical_data?.aadhaar_number,
        medical_history: updates.medical_history || localTriageRecords[idx].clinical_data?.medical_history,
      }
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'ASHA_WORKER' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const json = await res.json();
      return { data: json.record || updates, error: null };
    }
  } catch (backendErr) {
    console.warn('⚠️ [Backend PUT Notice]:', backendErr.message);
  }

  return { data: updates, error: null };
}

/**
 * Acknowledges emergency docket by doctor / medical officer.
 */
export async function acknowledgeTriageRecord(id, doctorId = 'DR_ON_DUTY') {
  const idx = localTriageRecords.findIndex((r) => String(r.id) === String(id));
  const ackTimestamp = new Date().toISOString();

  if (idx !== -1) {
    localTriageRecords[idx] = {
      ...localTriageRecords[idx],
      acknowledged_by: doctorId,
      acknowledged_at: ackTimestamp,
      status: 'ACKNOWLEDGED_BY_DOCTOR'
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/triage/${id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'CHC_DOCTOR', 'x-staff-id': doctorId },
      body: JSON.stringify({ doctor_id: doctorId }),
    });
    if (res.ok) {
      return { success: true, acknowledged_at: ackTimestamp };
    }
  } catch (err) {
    console.warn('⚠️ [Ack Endpoint Warning]:', err.message);
  }

  return { success: true, acknowledged_at: ackTimestamp };
}

/**
 * Escalates emergency docket due to 3-minute SLA timeout.
 */
export async function escalateTriageRecord(id) {
  try {
    await fetch(`${API_BASE_URL}/api/triage/${id}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'SYSTEM' },
    });
  } catch (err) {}
}

/**
 * Deletes a triage/patient record.
 */
export async function deleteTriageRecord(id) {
  localTriageRecords = localTriageRecords.filter((r) => String(r.id) !== String(id));

  try {
    const res = await fetch(`${API_BASE_URL}/api/patients/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'SUPERINTENDENT' }
    });
    if (res.ok) {
      return { success: true, error: null };
    }
  } catch (backendErr) {
    console.warn('⚠️ [Backend DELETE Notice]:', backendErr.message);
  }

  return { success: true, error: null };
}

/**
 * Fetches recent audit logs.
 */
export async function fetchAuditLogs(recordId = null, limit = 50) {
  try {
    const url = recordId
      ? `${API_BASE_URL}/api/audit-logs?record_id=${recordId}&limit=${limit}`
      : `${API_BASE_URL}/api/audit-logs?limit=${limit}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {}
  return [];
}

/**
 * Fetches all hospitals and healthcare facilities.
 */
export async function fetchFacilities(options = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      data: [
        {
          id: 1,
          name: 'BRD Medical College, Gorakhpur',
          type: 'Tertiary Hospital',
          location_lat: 26.7972,
          location_lng: 83.3768,
          available_services: ['ICU', 'Cardiology', 'Neurology', 'Surgery', 'X-Ray', 'Blood Bank', 'Endocrinology', 'Dialysis Unit'],
        },
        {
          id: 2,
          name: 'Gorakhpur Main District Hospital',
          type: 'District Hospital',
          location_lat: 26.7606,
          location_lng: 83.3732,
          available_services: ['Basic Surgery', 'ECG', 'Maternity', 'X-Ray', 'DOTS Centre', 'Toxicology', 'Pediatrics'],
        },
        {
          id: 3,
          name: 'Kauriram Community Health Centre (CHC)',
          type: 'CHC',
          location_lat: 26.5432,
          location_lng: 83.4567,
          available_services: ['Basic First Aid', 'Maternity', 'Pharmacy', 'Beds', 'General Medicine'],
        },
      ],
      error: null,
    };
  }

  try {
    let query = supabase.from('facilities').select('*').order('id', { ascending: true });

    if (options.type) {
      query = query.eq('type', options.type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('🔥 [Supabase Error - fetchFacilities]:', error);
      return { data: null, error };
    }

    const normalizedFacilities = (data || []).map((facility) => ({
      ...facility,
      available_services: parseAvailableServices(facility.available_services),
    }));

    return { data: normalizedFacilities, error: null };
  } catch (err) {
    console.error('🔥 [Supabase Exception - fetchFacilities]:', err);
    return { data: null, error: err };
  }
}

/**
 * Fetches paginated triage and patient queue records with server-side search and urgency filtering.
 */
export async function fetchPaginatedPatients({ page = 1, limit = 20, search = '', urgency = 'all' } = {}) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search.trim(),
      urgency: urgency.trim()
    });

    const res = await fetch(`${API_BASE_URL}/api/patients?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return {
          data: normalizeRecords(json.data),
          pagination: json.pagination || {
            page,
            limit,
            total: json.data.length,
            totalPages: Math.max(1, Math.ceil(json.data.length / limit)),
            hasPrev: page > 1,
            hasNext: false
          },
          error: null
        };
      }
    }
  } catch (err) {
    console.warn('⚠️ [Backend Paginated Patients Notice]:', err.message);
  }

  // Fallback in-memory pagination engine
  let filtered = [...localTriageRecords];

  if (urgency && urgency !== 'all') {
    filtered = filtered.filter(
      (r) => (r.ai_urgency_score || r.urgency_score || '').toLowerCase() === urgency.toLowerCase()
    );
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      const patientName = (r.clinical_data?.patient_name || r.patient_name || '').toLowerCase();
      const id = (r.id || '').toLowerCase();
      const aadhaar = (r.aadhaar_number || '');
      const symptoms = (r.symptoms_text || r.symptoms || '').toLowerCase();
      return (
        patientName.includes(q) ||
        id.includes(q) ||
        aadhaar.includes(q) ||
        symptoms.includes(q)
      );
    });
  }

  // Priority sorting: Critical (1) at top, High (2), Moderate (3), Low (4), then created_at DESC
  const weightMap = { critical: 1, high: 2, moderate: 3, low: 4 };
  filtered.sort((a, b) => {
    const wA = weightMap[(a.ai_urgency_score || a.urgency_score || '').toLowerCase()] || 5;
    const wB = weightMap[(b.ai_urgency_score || b.urgency_score || '').toLowerCase()] || 5;
    if (wA !== wB) return wA - wB;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const sliced = filtered.slice(offset, offset + limit);

  return {
    data: normalizeRecords(sliced),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    },
    error: null
  };
}

/**
 * Fetches recent triage records.
 */
export async function fetchRecentTriageRecords(limit = 15) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/patients?limit=${limit}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        return { data: normalizeRecords(json.data), error: null };
      }
    }
  } catch {}

  if (!isSupabaseConfigured() || !supabase) {
    return { data: localTriageRecords.slice(0, limit), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('triage_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return { data: localTriageRecords.slice(0, limit), error: null };
    }

    return { data: normalizeRecords(data), error: null };
  } catch (err) {
    console.error('🔥 [Supabase Exception - fetchRecentTriageRecords]:', err);
    return { data: localTriageRecords.slice(0, limit), error: null };
  }
}

function normalizeRecords(data) {
  return data.map((record) => {
    let medHistory =
      record.medical_history ||
      record.clinical_data?.medical_history ||
      '';

    let aadhaar =
      record.aadhaar_number ||
      record.clinical_data?.aadhaar_number ||
      '';

    const cleanAadhaar = String(aadhaar).replace(/\D/g, '');
    const patientUid = record.patient_uid || (cleanAadhaar ? cleanAadhaar.replace(/(\d{4})(?=\d)/g, '$1 ') : 'XXXX-XXXX-XXXX');

    let ackBy =
      record.acknowledged_by ||
      record.clinical_data?.acknowledged_by ||
      null;

    let ackAt =
      record.acknowledged_at ||
      record.clinical_data?.acknowledged_at ||
      null;

    const rawName = record.name || record.patient_name || record.clinical_data?.patient_name || 'UNREGISTERED CASUALTY';
    const rawAgeGender = record.patient_age || record.clinical_data?.patient_age || '';
    const parsedAge = record.age !== undefined ? record.age : (parseInt(String(rawAgeGender).replace(/\D/g, ''), 10) || 45);
    const parsedGender = record.gender || (String(rawAgeGender).toUpperCase().includes('FEMALE') || String(rawAgeGender).toUpperCase().includes('/ F') ? 'FEMALE' : 'MALE');
    const source = record.source || record.clinical_data?.source || (String(record.symptoms_text || record.symptoms || '').includes('DIRECT WALK-IN') ? 'WALK_IN' : 'ASHA');
    
    // Normalize triage priority
    const rawUrgency = record.triage_priority || record.ai_urgency_score || record.urgency_score || 'ROUTINE';
    const triagePriority = String(rawUrgency).toUpperCase().includes('CRIT') ? 'CRITICAL' : String(rawUrgency).toUpperCase().includes('HIGH') || String(rawUrgency).toUpperCase().includes('URG') ? 'URGENT' : 'ROUTINE';
    const aiUrgencyScore = triagePriority === 'CRITICAL' ? 'Critical' : triagePriority === 'URGENT' ? 'High' : 'Moderate';

    const rawVitals = record.vitals || record.clinical_data?.vitals || {
      bp: '120/80',
      hr: 75,
      spo2: 98,
      temp: 98.6
    };

    const complaint = record.complaint || record.symptoms_text || record.symptoms || 'Acute clinical presentation recorded.';
    const status = record.status || (triagePriority === 'CRITICAL' ? 'PENDING' : 'PENDING');
    const prescriptions = Array.isArray(record.prescriptions) ? record.prescriptions : (Array.isArray(record.clinical_data?.prescriptions) ? record.clinical_data.prescriptions : []);

    return {
      ...record,
      id: record.id,
      patient_uid: patientUid,
      name: rawName,
      age: parsedAge,
      gender: parsedGender,
      source,
      triage_priority: triagePriority,
      vitals: rawVitals,
      complaint,
      status,
      prescriptions,
      created_at: record.created_at || new Date().toISOString(),
      // Backward compatibility fields
      aadhaar_number: cleanAadhaar,
      patient_name: rawName,
      patient_age: `${parsedAge} / ${parsedGender}`,
      symptoms_text: complaint,
      ai_urgency_score: aiUrgencyScore,
      urgency_score: aiUrgencyScore,
      acknowledged_by: ackBy,
      acknowledged_at: ackAt,
      medical_history:
        typeof medHistory === 'string'
          ? medHistory
          : Array.isArray(medHistory)
          ? medHistory.join(', ')
          : '',
      clinical_data: {
        ...record.clinical_data,
        patient_name: rawName,
        patient_age: `${parsedAge} / ${parsedGender}`,
        aadhaar_number: cleanAadhaar,
        patient_uid: patientUid,
        gender: parsedGender,
        source,
        vitals: rawVitals,
        prescriptions,
        medical_history:
          typeof medHistory === 'string'
            ? medHistory
            : Array.isArray(medHistory)
            ? medHistory.join(', ')
            : '',
        suggested_specialist: record.suggested_specialist || record.clinical_data?.suggested_specialist || 'General Medicine',
        immediate_action: record.immediate_action || record.clinical_data?.immediate_action || 'Review and triage.'
      }
    };
  });
}

export default {
  parseAvailableServices,
  insertTriageRecord,
  updateTriageRecord,
  deleteTriageRecord,
  acknowledgeTriageRecord,
  escalateTriageRecord,
  fetchAuditLogs,
  fetchFacilities,
  fetchRecentTriageRecords,
  fetchPaginatedPatients
};
