import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { validateTriagePayload } from '../middleware/validate.js';
import { authenticateUser, requireRole, enforcePatientIsolation, ROLES } from '../middleware/auth.js';
import { logAuditEvent, getAuditLogs } from '../services/auditLogger.js';

const router = express.Router();

// Attach user authentication context to all API routes
router.use(authenticateUser);

// In-memory fallback cache for development/offline testing
let fallbackTriageStore = [
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

// GET /api/health
router.get('/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// GET /api/status
router.get('/status', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    server: 'Express.js',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    socketIO: 'Active',
    supabase: {
      configured: isSupabaseConfigured(),
      status: isSupabaseConfigured() ? 'Connected / Ready' : 'Placeholder keys (set SUPABASE_URL & SUPABASE_ANON_KEY in .env)'
    },
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key'),
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    }
  });
});

// GET /api/supabase-test - Supabase connection & fallback diagnostic check
router.get('/supabase-test', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const isConfigured = isSupabaseConfigured();
  let dbStatus = isConfigured ? 'connected' : 'unconfigured';
  let sampleCount = fallbackTriageStore.length;
  let tableCheck = null;
  let errorDetail = null;

  if (isConfigured && supabase) {
    try {
      const { data, count, error } = await supabase
        .from('triage_records')
        .select('*', { count: 'exact', head: true });
      if (error) {
        dbStatus = `error: ${error.message}`;
        errorDetail = error.message;
      } else {
        dbStatus = 'connected';
        tableCheck = 'ok';
        if (count !== null) sampleCount = count;
      }
    } catch (err) {
      dbStatus = `exception: ${err.message}`;
      errorDetail = err.message;
    }
  }

  return res.status(200).json({
    status: 'ok',
    supabase_configured: isConfigured,
    mode: isConfigured ? 'Supabase Cloud (PostgreSQL)' : 'Dual-Layer In-Memory Cache Fallback',
    database_status: dbStatus,
    table_check: tableCheck,
    record_count: sampleCount,
    error: errorDetail,
    timestamp: new Date().toISOString()
  });
});

// GET /api/audit-logs - Retrieve immutable clinical audit trails
router.get('/audit-logs', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { record_id, limit } = req.query;
    const logs = await getAuditLogs({ record_id, limit: parseInt(limit || '50', 10) });
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    console.error('🔥 [GET /api/audit-logs Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/patient/my-records - Patient isolated self-service query
router.get('/patient/my-records', enforcePatientIsolation, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const targetAadhaar = req.patientFilterAadhaar || req.query.aadhaar || req.headers['x-patient-aadhaar'];

  if (!targetAadhaar) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Provide valid Aadhaar UID in x-patient-aadhaar header or ?aadhaar query param.'
    });
  }

  const clean = String(targetAadhaar).replace(/\s+/g, '');

  try {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('triage_records')
        .select('*')
        .eq('aadhaar_number', clean)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return res.status(200).json({ success: true, data });
      }
    }

    const filtered = fallbackTriageStore.filter((r) => String(r.aadhaar_number).replace(/\s+/g, '') === clean);
    return res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/patients & GET /api/triage - Optimized Scalable Paginated Queue
const getRecordsHandler = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim().toLowerCase();
    const urgency = (req.query.urgency || '').trim();

    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('triage_records')
          .select('*', { count: 'exact' });

        if (urgency && urgency !== 'all') {
          query = query.ilike('ai_urgency_score', `%${urgency}%`);
        }

        if (search) {
          query = query.or(`symptoms_text.ilike.%${search}%,aadhaar_number.ilike.%${search}%,id.ilike.%${search}%`);
        }

        // Order by created_at DESC with range pagination (LIMIT & OFFSET)
        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;

        if (!error && data) {
          // Sort by urgency priority (Critical > High > Moderate > Low) on page results
          const priorityWeight = { critical: 1, high: 2, moderate: 3, low: 4 };
          data.sort((a, b) => {
            const wA = priorityWeight[(a.ai_urgency_score || '').toLowerCase()] || 5;
            const wB = priorityWeight[(b.ai_urgency_score || '').toLowerCase()] || 5;
            if (wA !== wB) return wA - wB;
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          });

          const total = count !== null ? count : data.length;
          const totalPages = Math.max(1, Math.ceil(total / limit));

          return res.status(200).json({
            success: true,
            data,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasPrev: page > 1,
              hasNext: page < totalPages
            }
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ [Supabase Paginated Query Fallback]:', dbErr.message);
      }
    }

    // In-memory fallback pagination & priority sorting engine
    let filtered = [...fallbackTriageStore];

    // Filter by urgency tier
    if (urgency && urgency !== 'all') {
      filtered = filtered.filter(
        (r) => (r.ai_urgency_score || '').toLowerCase() === urgency.toLowerCase()
      );
    }

    // Server-side text search (LIKE operators on ID, Name, Aadhaar, Symptoms)
    if (search) {
      filtered = filtered.filter((r) => {
        const patientName = (r.clinical_data?.patient_name || r.patient_name || '').toLowerCase();
        const id = (r.id || '').toLowerCase();
        const aadhaar = (r.aadhaar_number || '');
        const symptoms = (r.symptoms_text || '').toLowerCase();
        return (
          patientName.includes(search) ||
          id.includes(search) ||
          aadhaar.includes(search) ||
          symptoms.includes(search)
        );
      });
    }

    // Priority sorting: Critical (1) at absolute top, then High (2), Moderate (3), Low (4), followed by created_at DESC
    const weightMap = { critical: 1, high: 2, moderate: 3, low: 4 };
    filtered.sort((a, b) => {
      const wA = weightMap[(a.ai_urgency_score || '').toLowerCase()] || 5;
      const wB = weightMap[(b.ai_urgency_score || '').toLowerCase()] || 5;
      if (wA !== wB) return wA - wB;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginatedSlice = filtered.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      data: paginatedSlice,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages
      }
    });
  } catch (err) {
    console.error('🔥 [GET /api/patients Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
router.get('/patients', getRecordsHandler);
router.get('/triage', getRecordsHandler);

// POST /api/patients - Register new walk-in patient or facility admission record
router.post('/patients', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const payload = req.body || {};
    const patientName = payload.name || payload.patient_name || 'WALK-IN CASUALTY';
    const patientAge = payload.age || payload.patient_age || 'UNKNOWN';
    const gender = payload.gender || 'MALE';
    const source = payload.source || 'WALK_IN';
    const symptoms = payload.complaint || payload.symptoms || payload.symptoms_text || 'Direct Walk-In clinical presentation recorded.';
    
    // Explicit bed extraction for observation ward
    const bed = payload.bed || payload.bed_number || payload.clinical_data?.bed || payload.clinical_data?.bed_number || null;

    // Normalize triage priority
    const rawPriority = payload.triage_priority || payload.urgency_score || payload.ai_urgency_score || 'ROUTINE';
    const priorityNorm = rawPriority.toUpperCase().includes('CRIT') ? 'CRITICAL' : rawPriority.toUpperCase().includes('HIGH') || rawPriority.toUpperCase().includes('URG') ? 'URGENT' : 'ROUTINE';
    const urgencyScore = priorityNorm === 'CRITICAL' ? 'Critical' : priorityNorm === 'URGENT' ? 'High' : 'Moderate';

    const cleanAadhaar = payload.patient_uid
      ? String(payload.patient_uid).replace(/\D/g, '')
      : payload.aadhaar_number
      ? String(payload.aadhaar_number).replace(/\D/g, '')
      : '';
    const formattedUid = cleanAadhaar ? cleanAadhaar.replace(/(\d{4})(?=\d)/g, '$1 ') : 'XXXX-XXXX-XXXX';
    
    const medicalHistory = payload.medical_history || payload.medicalHistory || 'None recorded';
    const status = payload.status || (priorityNorm === 'CRITICAL' ? 'DISPATCHED' : priorityNorm === 'URGENT' ? 'ADMITTED' : 'DISCHARGED');
    const specialist = payload.suggested_specialist || 'Emergency Medical Officer (Walk-In Service)';
    const action = payload.immediate_action || 'Admit to facility and evaluate.';
    const vitals = payload.vitals || null;
    const gcs = payload.gcs || '15';
    const prescriptions = Array.isArray(payload.prescriptions) ? payload.prescriptions : [];
    const facilityId = payload.referred_facility_id ? Number(payload.referred_facility_id) : null;

    let newRecord = {
      id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
      patient_uid: formattedUid,
      name: patientName,
      age: typeof patientAge === 'number' ? patientAge : parseInt(patientAge, 10) || 0,
      gender,
      source,
      bed: bed,
      bed_number: bed,
      triage_priority: priorityNorm,
      symptoms_text: symptoms,
      complaint: symptoms,
      ai_urgency_score: urgencyScore,
      aadhaar_number: cleanAadhaar,
      medical_history: medicalHistory,
      vitals,
      prescriptions,
      clinical_data: {
        patient_name: patientName,
        patient_age: `${patientAge} / ${gender}`,
        aadhaar_number: cleanAadhaar,
        patient_uid: formattedUid,
        gender,
        source,
        bed: bed,
        bed_number: bed,
        medical_history: medicalHistory,
        suggested_specialist: specialist,
        immediate_action: action,
        vitals,
        gcs,
        prescriptions,
        recorded_by: req.user?.staffId || 'DR_ON_CALL',
        client_timestamp: new Date().toISOString()
      },
      status,
      referred_facility_id: facilityId,
      acknowledged_by: req.user?.staffId || 'DR_ON_CALL',
      acknowledged_at: new Date().toISOString()
    };

    // 1. Insert into in-memory store at the beginning
    fallbackTriageStore = [newRecord, ...fallbackTriageStore.filter((r) => r.id !== newRecord.id)];

    // 2. Persist to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('triage_records')
          .insert([{
            symptoms_text: symptoms,
            ai_urgency_score: urgencyScore,
            aadhaar_number: cleanAadhaar || null,
            clinical_data: newRecord.clinical_data,
            status,
            referred_facility_id: facilityId,
            patient_id: null
          }])
          .select();

        if (!dbError && dbData && dbData.length > 0) {
          newRecord = { ...newRecord, ...dbData[0] };
        }
      } catch (dbErr) {
        console.warn('⚠️ [Supabase Walk-In Insert Notice]:', dbErr.message);
      }
    }

    // 3. Log Audit Trail
    await logAuditEvent({
      record_id: newRecord.id,
      event_type: 'CREATED',
      staff_id: req.user?.staffId || 'DR_ON_CALL',
      staff_role: req.user?.role || 'CHC_DOCTOR',
      urgency_level: urgencyScore,
      delta_changes: {
        action: 'Direct walk-in patient registered & clinical disposition executed',
        patient_name: patientName,
        status,
        urgency: priorityNorm,
        prescriptions_count: prescriptions.length
      },
      ip_address: req.user?.ip
    });

    // 4. Broadcast via Socket.io
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('triage_update', newRecord);
        io.emit('patient_updated', newRecord);
        if (priorityNorm === 'CRITICAL') {
          io.emit('emergency_alert', {
            id: newRecord.id,
            alert_level: 'Critical',
            patient_name: patientName,
            aadhaar_number: cleanAadhaar,
            specialist,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (sErr) {}

    console.log(`✅ [WALK-IN PATIENT REGISTERED]: ${newRecord.id} - ${patientName} (${status})`);

    return res.status(201).json({
      success: true,
      message: 'Walk-in patient successfully registered and evaluated',
      record: newRecord,
      data: newRecord
    });
  } catch (err) {
    console.error('🔥 [POST /api/patients Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/triage/:id/acknowledge - Doctor acknowledges emergency docket
router.post('/triage/:id/acknowledge', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { id } = req.params;
  const staffId = req.user?.staffId || req.body.doctor_id || 'DR_ON_CALL';
  const ackTimestamp = new Date().toISOString();

  console.log(`[DOCTOR ACKNOWLEDGMENT]: Record ${id} acknowledged by ${staffId}`);

  // Update in-memory
  const idx = fallbackTriageStore.findIndex((r) => String(r.id) === String(id));
  if (idx !== -1) {
    fallbackTriageStore[idx] = {
      ...fallbackTriageStore[idx],
      acknowledged_by: staffId,
      acknowledged_at: ackTimestamp,
      status: 'ACKNOWLEDGED_BY_DOCTOR'
    };
  }

  // Update Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('triage_records').update({
        status: 'ACKNOWLEDGED_BY_DOCTOR',
        clinical_data: {
          acknowledged_by: staffId,
          acknowledged_at: ackTimestamp
        }
      }).eq('id', id);
    } catch (err) {
      console.warn('⚠️ [Supabase Ack Notice]:', err.message);
    }
  }

  // Log Immutable Audit Event
  await logAuditEvent({
    record_id: id,
    event_type: 'ACKNOWLEDGED',
    staff_id: staffId,
    staff_role: req.user?.role || 'CHC_DOCTOR',
    urgency_level: 'Critical',
    delta_changes: {
      action: 'Doctor acknowledged emergency patient docket',
      acknowledged_at: ackTimestamp
    },
    ip_address: req.user?.ip
  });

  // Broadcast WebSocket event
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('triage_acknowledged', {
        id,
        acknowledged_by: staffId,
        acknowledged_at: ackTimestamp
      });
      console.log(`🔌 [Socket.io]: Broadcasted triage_acknowledged for ${id}`);
    }
  } catch (err) {}

  return res.status(200).json({
    success: true,
    message: `Emergency docket ${id} successfully acknowledged by ${staffId}`,
    acknowledged_at: ackTimestamp
  });
});

// POST /api/triage/:id/escalate - Log Critical SLA Breach & Notify Superintendent
router.post('/triage/:id/escalate', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { id } = req.params;
  const breachTimestamp = new Date().toISOString();

  console.warn(`🚨 [CRITICAL SLA ESCALATION]: Record ${id} breached 3-minute acknowledgment window!`);

  // Log Immutable Audit Event
  await logAuditEvent({
    record_id: id,
    event_type: 'SLA_BREACHED',
    staff_id: 'SYSTEM_ESCALATION_ENGINE',
    staff_role: 'SYSTEM',
    urgency_level: 'Critical',
    delta_changes: {
      reason: '3-minute emergency acknowledgment timeout exceeded without doctor response',
      notified_parties: ['CHC_SUPERINTENDENT', 'DISTRICT_108_DISPATCH'],
      breach_timestamp: breachTimestamp
    },
    ip_address: req.user?.ip
  });

  // Broadcast WebSocket escalation event
  try {
    const io = req.app.get('io');
    if (io) {
      io.emit('critical_sla_breach', {
        id,
        alert_level: 'CRITICAL_SLA_BREACH',
        message: `CRITICAL SLA BREACH: Case ${id} exceeded acknowledgment window. CHC Superintendent & 108 Emergency Dispatch notified.`,
        timestamp: breachTimestamp
      });
      console.log(`🔌 [Socket.io]: Broadcasted critical_sla_breach for ${id}`);
    }
  } catch (err) {}

  return res.status(200).json({
    success: true,
    message: `SLA breach recorded. CHC Superintendent and emergency dispatch notified.`,
    breach_timestamp: breachTimestamp
  });
});

// PUT /api/patients/:id & PUT /api/triage/:id - Update existing patient / triage record
const updateRecordHandler = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { id } = req.params;
  const updates = req.body || {};

  console.log(`[BACKEND UPDATE RECORD]: ID = ${id}`, updates);

  try {
    let updatedRecord = null;

    const patientName = updates.name || updates.patient_name || updates.clinical_data?.patient_name;
    const patientAge = updates.age !== undefined ? updates.age : (updates.patient_age || updates.clinical_data?.patient_age);
    const gender = updates.gender || updates.clinical_data?.gender;
    const source = updates.source || updates.clinical_data?.source;
    const symptoms = updates.complaint || updates.symptoms || updates.symptoms_text;
    const medicalHistory = updates.medical_history || updates.clinical_data?.medical_history;
    const aadhaar = updates.patient_uid || updates.aadhaar_number || updates.clinical_data?.aadhaar_number;
    const urgency = updates.triage_priority || updates.urgency_score || updates.ai_urgency_score;
    const status = updates.status;
    const specialist = updates.suggested_specialist || updates.target_specialty || updates.clinical_data?.suggested_specialist;
    const action = updates.immediate_action || updates.clinical_data?.immediate_action;
    const prescriptions = updates.prescriptions || updates.clinical_data?.prescriptions;
    const bed = updates.bed !== undefined ? updates.bed : (updates.bed_number !== undefined ? updates.bed_number : (updates.clinical_data?.bed !== undefined ? updates.clinical_data?.bed : updates.clinical_data?.bed_number));

    // Check in-memory store first
    const existingIndex = fallbackTriageStore.findIndex((r) => String(r.id) === String(id));
    if (existingIndex !== -1) {
      const old = fallbackTriageStore[existingIndex];
      fallbackTriageStore[existingIndex] = {
        ...old,
        ...updates,
        name: patientName !== undefined ? patientName : old.name,
        age: patientAge !== undefined ? patientAge : old.age,
        gender: gender !== undefined ? gender : old.gender,
        source: source !== undefined ? source : old.source,
        bed: bed !== undefined ? bed : old.bed,
        bed_number: bed !== undefined ? bed : old.bed_number,
        symptoms_text: symptoms !== undefined ? symptoms : old.symptoms_text,
        complaint: symptoms !== undefined ? symptoms : old.complaint,
        ai_urgency_score: urgency !== undefined ? urgency : old.ai_urgency_score,
        triage_priority: updates.triage_priority || old.triage_priority,
        aadhaar_number: aadhaar !== undefined ? aadhaar : old.aadhaar_number,
        medical_history: medicalHistory !== undefined ? medicalHistory : old.medical_history,
        status: status !== undefined ? status : old.status,
        prescriptions: prescriptions !== undefined ? prescriptions : old.prescriptions,
        clinical_data: {
          ...old.clinical_data,
          ...updates.clinical_data,
          patient_name: patientName !== undefined ? patientName : old.clinical_data?.patient_name,
          patient_age: patientAge !== undefined ? patientAge : old.clinical_data?.patient_age,
          gender: gender !== undefined ? gender : old.clinical_data?.gender,
          source: source !== undefined ? source : old.clinical_data?.source,
          bed: bed !== undefined ? bed : (old.clinical_data?.bed !== undefined ? old.clinical_data?.bed : old.bed),
          bed_number: bed !== undefined ? bed : (old.clinical_data?.bed_number !== undefined ? old.clinical_data?.bed_number : old.bed_number),
          aadhaar_number: aadhaar !== undefined ? aadhaar : old.clinical_data?.aadhaar_number,
          medical_history: medicalHistory !== undefined ? medicalHistory : old.clinical_data?.medical_history,
          suggested_specialist: specialist !== undefined ? specialist : old.clinical_data?.suggested_specialist,
          immediate_action: action !== undefined ? action : old.clinical_data?.immediate_action,
          prescriptions: prescriptions !== undefined ? prescriptions : old.clinical_data?.prescriptions
        }
      };
      updatedRecord = fallbackTriageStore[existingIndex];
    }

    // Update in Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const dbPayload = {};
        if (symptoms) dbPayload.symptoms_text = symptoms;
        if (urgency) dbPayload.ai_urgency_score = urgency;
        if (aadhaar !== undefined) dbPayload.aadhaar_number = aadhaar;
        if (status) dbPayload.status = status;
        if (updates.referred_facility_id !== undefined) dbPayload.referred_facility_id = updates.referred_facility_id;

        const { data: existingDb } = await supabase.from('triage_records').select('*').eq('id', id).single();
        if (existingDb) {
          dbPayload.clinical_data = {
            ...existingDb.clinical_data,
            ...(patientName && { patient_name: patientName }),
            ...(patientAge && { patient_age: patientAge }),
            ...(aadhaar !== undefined && { aadhaar_number: aadhaar }),
            ...(medicalHistory !== undefined && { medical_history: medicalHistory }),
            ...(specialist && { suggested_specialist: specialist }),
            ...(action && { immediate_action: action }),
            ...(bed !== undefined && { bed: bed, bed_number: bed })
          };
        }

        const { data: dbData, error: dbError } = await supabase
          .from('triage_records')
          .update(dbPayload)
          .eq('id', id)
          .select();

        if (!dbError && dbData && dbData.length > 0) {
          updatedRecord = { ...updatedRecord, ...dbData[0] };
        }
      } catch (dbEx) {
        console.warn('⚠️ [Supabase Update Exception]:', dbEx.message);
      }
    }

    if (!updatedRecord) {
      updatedRecord = {
        id,
        ...updates,
        bed: bed,
        bed_number: bed,
        symptoms_text: symptoms,
        ai_urgency_score: urgency || 'Moderate',
        clinical_data: {
          ...(updates.clinical_data || {}),
          bed: bed,
          bed_number: bed
        },
        updated_at: new Date().toISOString()
      };
    }

    // Log Immutable Audit Trail Event
    await logAuditEvent({
      record_id: id,
      event_type: 'EDITED',
      staff_id: req.user?.staffId || 'HEALTH_WORKER',
      staff_role: req.user?.role || 'ASHA_WORKER',
      urgency_level: updatedRecord.ai_urgency_score,
      delta_changes: {
        updates: Object.keys(updates)
      },
      ip_address: req.user?.ip
    });

    // Broadcast Real-Time Update via Socket.io
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('patient_updated', updatedRecord);
        io.emit('triage_updated', updatedRecord);
        console.log(`🔌 [Socket.io]: Broadcasted patient_updated for record ${id}`);
      }
    } catch (socketErr) {}

    return res.status(200).json({
      success: true,
      message: 'Patient record successfully updated',
      record: updatedRecord
    });

  } catch (err) {
    console.error(`🔥 [PUT /api/patients/${id} Error]:`, err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message || 'Failed to update patient record.'
    });
  }
};
router.put('/patients/:id', updateRecordHandler);
router.put('/triage/:id', updateRecordHandler);

// DELETE /api/patients/:id & DELETE /api/triage/:id - Remove record from Supabase / store
const deleteRecordHandler = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { id } = req.params;

  console.log(`[BACKEND DELETE RECORD]: ID = ${id}`);

  try {
    fallbackTriageStore = fallbackTriageStore.filter((r) => String(r.id) !== String(id));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('triage_records').delete().eq('id', id);
      } catch (dbEx) {
        console.warn('⚠️ [Supabase Delete Exception]:', dbEx.message);
      }
    }

    // Log Immutable Audit Trail Event
    await logAuditEvent({
      record_id: id,
      event_type: 'RESOLVED',
      staff_id: req.user?.staffId || 'ADMIN',
      staff_role: req.user?.role || 'SUPERINTENDENT',
      delta_changes: { action: 'Record deleted or resolved' },
      ip_address: req.user?.ip
    });

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('patient_deleted', { id });
        io.emit('triage_deleted', { id });
        console.log(`🔌 [Socket.io]: Broadcasted patient_deleted for record ${id}`);
      }
    } catch (socketErr) {}

    return res.status(200).json({
      success: true,
      message: 'Patient record successfully removed',
      id
    });

  } catch (err) {
    console.error(`🔥 [DELETE /api/patients/${id} Error]:`, err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message || 'Failed to delete patient record.'
    });
  }
};
router.delete('/patients/:id', deleteRecordHandler);
router.delete('/triage/:id', deleteRecordHandler);

// POST /api/triage & POST /api/triage/analyze (Refactored with Joi validation, Aadhaar integration, Comorbidity AI Weighting, and Socket.io Broadcast)
const triageHandler = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  const payload = req.validatedBody || req.body;
  console.log("[BACKEND TRIAGE PAYLOAD (VALIDATED)]:", payload);

  try {
    const {
      symptoms,
      aadhaar_number,
      patient_id,
      patient_name,
      patient_age,
      age,
      medical_history,
      additional_history,
      vitals,
      gcs,
      gcs_score,
      referred_facility_id
    } = payload;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      console.error("[BACKEND TRIAGE CONFIG ERROR]: Missing GEMINI_API_KEY");
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'GEMINI_API_KEY is not configured or is a placeholder in backend/.env'
      });
    }

    // 1. Build Comprehensive Structured Clinical Profile with Comorbidity & Identity Context
    let fullPromptText = symptoms.trim();
    const clinicalContextBlocks = [];

    const effectivePatient = patient_name || patient_id || '';
    const effectiveAge = patient_age || age || '';
    const cleanAadhaar = aadhaar_number ? String(aadhaar_number).replace(/\s+/g, '') : '';

    if (effectivePatient || effectiveAge || cleanAadhaar) {
      const idParts = [];
      if (effectivePatient) idParts.push(effectivePatient);
      if (effectiveAge) idParts.push(effectiveAge);
      if (cleanAadhaar) idParts.push(`UID: ${cleanAadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3')}`);
      clinicalContextBlocks.push(`PATIENT IDENTIFIER: ${idParts.join(', ')}`);
    }

    // Normalize medical history
    let formattedHistory = '';
    if (medical_history) {
      if (Array.isArray(medical_history) && medical_history.length > 0) {
        formattedHistory = medical_history.join(', ');
      } else if (typeof medical_history === 'string' && medical_history.trim()) {
        formattedHistory = medical_history.trim();
      }
    }
    if (formattedHistory) {
      clinicalContextBlocks.push(`PRE-EXISTING CHRONIC COMORBIDITIES & MEDICAL HISTORY: ${formattedHistory}`);
    }

    if (additional_history && typeof additional_history === 'string' && additional_history.trim()) {
      clinicalContextBlocks.push(`PAST SURGERIES / MEDICATIONS / DRUG ALLERGIES: ${additional_history.trim()}`);
    }

    if (vitals) {
      clinicalContextBlocks.push(`POINT-OF-CARE VITALS: ${typeof vitals === 'object' ? JSON.stringify(vitals) : vitals}`);
    }

    const effectiveGcs = gcs || gcs_score;
    if (effectiveGcs) {
      clinicalContextBlocks.push(`GLASGOW COMA SCALE (GCS): ${effectiveGcs}`);
    }

    if (clinicalContextBlocks.length > 0) {
      fullPromptText = `${fullPromptText}\n\n[STRUCTURED CLINICAL PROFILE & COMORBIDITY AUDIT]\n${clinicalContextBlocks.join('\n')}`;
    }

    // 2. Initialize GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are a dedicated, authoritative, and empathetic rural Indian healthcare assistant and clinical triage expert (Swasthya Sahayak). Your role is to perform preliminary point-of-care medical triage for patients in rural and semi-urban Indian contexts, coordinating with ASHA workers, ANMs, Primary Health Centres (PHCs), Community Health Centres (CHCs), and District Hospitals.

Analyze the following patient presentation, chronic comorbidities, and physiological telemetry:
"""
${fullPromptText}
"""

COMORBIDITY WEIGHTING & CLINICAL ESCALATION RULES:
1. You MUST explicitly evaluate pre-existing chronic conditions (e.g., Hypertension, Type 2 Diabetes, Coronary Artery Disease / Stents, COPD / Asthma, Tuberculosis history, Chronic Kidney Disease, Pregnancy / Postpartum).
2. Pre-existing cardiovascular, pulmonary, or metabolic comorbidities significantly increase mortality risk and MUST elevate baseline triage urgency by at least one tier during acute presentations (e.g., acute chest pain or severe headache in a known hypertensive/diabetic patient MUST be classified as "Critical" or "High" with urgent cardiac/tertiary hospital transfer).
3. First-aid instructions must provide immediate, practical, supportive steps tailored to both the acute presentation and the patient's documented chronic history while awaiting transport.

Provide your triage assessment strictly adhering to this JSON schema:
{
  "urgency_score": "Critical" | "High" | "Moderate" | "Low",
  "suggested_specialist": "Name of medical specialist or appropriate rural healthcare tier/facility",
  "immediate_action": "Safe, practical immediate first-aid, supportive home-care steps, or urgent transfer guidance for a rural Indian setting while seeking medical care"
}

Urgency Score Definitions:
- Critical: Life-threatening emergencies (e.g., acute coronary syndrome/chest pain, stroke signs, severe breathing difficulty/stridor, venomous snakebite, loss of consciousness, severe trauma/bleeding). Requires immediate emergency hospital transfer (108 Ambulance).
- High: Serious acute symptoms or severe exacerbation of chronic diseases (e.g., diabetic ketoacidosis risk, uncontrolled hypertensive emergency, severe asthma flare, high persistent fever with delirium, deep wounds). Requires medical consultation within hours.
- Moderate: Subacute or persistent discomfort needing evaluation at a PHC/CHC within 24-48 hours.
- Low: Mild, self-limiting symptoms manageable with home supportive care and ASHA/PHC follow-up if symptoms persist.

Rules:
1. You MUST respond ONLY with valid JSON.
2. DO NOT include markdown formatting, code block ticks (\`\`\`json), or any preamble/postamble.
3. Ensure urgency_score is exactly one of: "Critical", "High", "Moderate", "Low".`;

    // 3. Generate response using Gemini with automatic flash fallback
    let result;
    const requestedModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    try {
      const model = genAI.getGenerativeModel({
        model: requestedModel,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });
      result = await model.generateContent(prompt);
    } catch (modelErr) {
      if (modelErr.status === 404 || modelErr.message?.includes('not found')) {
        console.warn(`⚠️ [Gemini]: Model "${requestedModel}" returned 404/not found. Falling back to gemini-2.5-flash...`);
        const fallbackModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });
        result = await fallbackModel.generateContent(prompt);
      } else {
        throw modelErr;
      }
    }

    const response = await result.response;
    let text = response.text();

    // 4. Clean markdown wrapper if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    // 5. Parse JSON response
    let triageResult;
    try {
      triageResult = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', text, parseErr);
      return res.status(502).json({
        success: false,
        error: 'Bad Gateway',
        message: 'Failed to parse AI response as JSON',
        rawResponse: text
      });
    }

    // 6. Normalize urgency score
    const validScores = ['Critical', 'High', 'Moderate', 'Low'];
    const urgency = validScores.find(
      (score) => score.toLowerCase() === (triageResult.urgency_score || '').toLowerCase()
    ) || triageResult.urgency_score || 'Moderate';

    const rawAction = triageResult.immediate_action || 'Consult a nearby healthcare provider immediately.';

    // Extract clean directives array
    const directives = rawAction
      .split(/(?:\r?\n|(?<=[.!?])\s+(?=[0-9]+\.|\*|-|[A-Z]))/)
      .map((item) => item.trim().replace(/^[-*•\d.]+\s*/, ''))
      .filter((item) => item.length > 5);

    // 7. Structure the Response Object
    const responsePayload = {
      success: true,
      urgency_score: urgency,
      target_specialty: triageResult.suggested_specialist || 'General Physician / PHC Medical Officer',
      suggested_specialist: triageResult.suggested_specialist || 'General Physician / PHC Medical Officer',
      immediate_action: rawAction,
      directives: directives.length > 0 ? directives : [rawAction],
      medical_history: formattedHistory,
      aadhaar_number: cleanAadhaar,
      timestamp: new Date().toISOString()
    };

    // 8. Resilient Database Persistence & Socket.io Real-Time Broadcasting
    let savedRecord = {
      id: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
      symptoms_text: symptoms,
      ai_urgency_score: urgency,
      aadhaar_number: cleanAadhaar,
      medical_history: formattedHistory,
      clinical_data: {
        suggested_specialist: responsePayload.suggested_specialist,
        immediate_action: rawAction,
        patient_name: effectivePatient || 'ANONYMOUS_PATIENT',
        patient_age: effectiveAge || 'UNKNOWN',
        aadhaar_number: cleanAadhaar,
        medical_history: formattedHistory,
        vitals: vitals || null,
        gcs: effectiveGcs || '15',
        recorded_by: req.user?.staffId || 'ASHA Swasthya Sahayak',
        client_timestamp: new Date().toISOString()
      },
      status: urgency === 'Critical' || urgency === 'High' ? 'URGENT_TRIAGE' : 'ROUTINE_TRIAGE',
      referred_facility_id: referred_facility_id ? Number(referred_facility_id) : null
    };

    // Add to fallback cache
    fallbackTriageStore = [savedRecord, ...fallbackTriageStore.filter((r) => r.id !== savedRecord.id)].slice(0, 50);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('triage_records')
          .insert([{
            symptoms_text: symptoms,
            ai_urgency_score: urgency,
            aadhaar_number: cleanAadhaar || null,
            clinical_data: savedRecord.clinical_data,
            status: savedRecord.status,
            referred_facility_id: savedRecord.referred_facility_id,
            patient_id: null
          }])
          .select();

        if (!dbError && dbData && dbData.length > 0) {
          savedRecord = { ...savedRecord, ...dbData[0] };
        }
      } catch (dbEx) {
        console.warn('⚠️ [Supabase DB Exception Handler]:', dbEx.message);
      }
    }

    // 9. Log Immutable Audit Trail for Record Creation
    await logAuditEvent({
      record_id: savedRecord.id,
      event_type: 'CREATED',
      staff_id: req.user?.staffId || 'ASHA_SAHAYAK_01',
      staff_role: req.user?.role || 'ASHA_WORKER',
      urgency_level: urgency,
      delta_changes: {
        symptoms: symptoms.substring(0, 100),
        urgency,
        specialist: responsePayload.suggested_specialist,
        aadhaar: cleanAadhaar || 'NONE'
      },
      ip_address: req.user?.ip
    });

    // 10. Real-Time Socket.io Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('triage_update', {
          ...savedRecord,
          urgency_score: urgency,
          suggested_specialist: responsePayload.suggested_specialist,
          medical_history: formattedHistory,
          aadhaar_number: cleanAadhaar,
          timestamp: new Date().toISOString()
        });

        if (urgency === 'Critical' || urgency === 'High') {
          io.emit('emergency_alert', {
            id: savedRecord.id,
            alert_level: urgency,
            patient_name: effectivePatient || 'ANONYMOUS',
            aadhaar_number: cleanAadhaar,
            specialist: responsePayload.suggested_specialist,
            facility_id: referred_facility_id || null,
            timestamp: new Date().toISOString()
          });
        }
        console.log(`🔌 [Socket.io]: Broadcasted triage_update & emergency_alert for record ${savedRecord.id}`);
      }
    } catch (socketErr) {}

    console.log("[BACKEND TRIAGE RESPONSE]:", JSON.stringify(responsePayload, null, 2));

    return res.status(200).json({
      ...responsePayload,
      record: savedRecord
    });

  } catch (error) {
    console.error('🔥 [Triage Pipeline Exception]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred during triage analysis.'
    });
  }
};

router.post('/triage', validateTriagePayload, triageHandler);
router.post('/triage/analyze', validateTriagePayload, triageHandler);

export default router;
