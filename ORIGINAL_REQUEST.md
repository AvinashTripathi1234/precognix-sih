# Original User Request

## Initial Request — 2026-09-01T09:18:45Z

You are the Project Orchestrator (teamwork_preview_orchestrator).
Working directory: c:\Users\PC\Desktop\SIH26\.agents\orchestrator_1
Project root: c:\Users\PC\Desktop\SIH26
Original request file: c:\Users\PC\Desktop\SIH26\ORIGINAL_REQUEST.md

You have been tasked to orchestrate parallel, decoupled improvements across the Backend API infrastructure and Frontend clinical UI for the Precognix-SIH Medical Command & Emergency Triage Terminal.

Requirements to fulfill:
## R1. Backend Infrastructure, Resilience & Telemetry (Backend Track)
- Maintain and enhance the Express.js API routes (`GET /api/patients` with server-side pagination, search, and priority sorting; `POST /api/patients` for walk-in and facility admissions; `PUT /api/patients/:id`; `POST /api/triage/:id/acknowledge`; `POST /api/triage/:id/escalate`; `GET /api/audit-logs`; `GET /api/patient/my-records`).
- Support dual-layer data persistence (in-memory caching with Supabase/PostgreSQL schema synchronization) ensuring graceful degradation when remote databases are offline.
- Support real-time WebSocket broadcasting (`io.emit('triage_update')`, `io.emit('patient_updated')`, `io.emit('emergency_alert')`, `io.emit('critical_sla_breach')`).
- Enforce immutable clinical audit trails capturing all patient modifications, admissions, and SLA escalations.

## R2. Clinical Command Center & Modular Portals (Frontend Track)
- **Doctor Workflow**: Maintain strict component isolation in `DoctorDashboard.jsx` without component bleed:
  - **View A (`CommandQueue.jsx`)**: High-density vertical data table with color-coded left borders, time in queue, sticky server-side search, priority filters, pagination controls, and top `[ + REGISTER DIRECT WALK-IN ]` action bar.
  - **View B (`TriageDocket.jsx`)**: 70/30 split-pane active evaluation layout. Left pane (70%) features read-only bold demographics, physiological vitals matrix with red alert thresholds, chunky emergency protocol toggles (`CARD-01`, `TOX-02`, etc.), embedded `PrescriptionModule.jsx`, and three massive verdict buttons (`[ 🟥 DISPATCH AMBULANCE ]`, `[ 🟨 ADMIT TO WARD ]`, `[ 🟩 PRESCRIBE & DISCHARGE ]`). Right pane (30%, sticky) displays patient comorbidities and historical visit records locked in viewport.
  - **View C (`WalkInIntake.jsx`)**: Direct casualty registration form bypassing ASHA metadata that immediately handoffs the patient to View B for active evaluation.
- **Prescription Module (`PrescriptionModule.jsx`)**: Essential rural formulary presets with dosage/frequency controls, custom drug entry, and diagnostic lab test chips (`12-LEAD ECG`, `CBC`, `RBS`, `CHEST X-RAY`, `MALARIA RAPID KIT`).
- **ASHA Field Intake (`AshaDashboard.jsx`)**: High-contrast inputs, voice dictation, automatic network state detection with `[OFFLINE MODE: DATA SECURED]` banner, and IndexedDB caching.
- **Citizen Self-Service Dossier (`PatientPortal.jsx`)**: Read-only patient self-service with verified Aadhaar isolation, active triage status badge, and highlighted Ayushman Bharat-compliant digital prescription slip with printing support.
- **Universal Design Language**: Strict vintage brutalist styling (`#f5f2eb` vs `#121212`, `border-2 border-black dark:border-white`, `rounded-none`, heavy drop shadows `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`, mono/serif typographic hierarchy).

## Acceptance Criteria
### Automated Build & Test Gates
- Frontend production build (`npm run build` in `frontend/`) completes with 0 errors and zero missing exports.
- Backend test suite (`node test-verify.js` in `backend/`) passes 100% of integration assertions with 0 errors.
### Workflow & Functional Integrity
- Walk-In registrations persist across backend and frontend, dynamically assigning beds in the Local Facility Queue upon admission.
- 3-Minute Critical SLA countdown triggers audio/visual alarms and emits escalation events to connected doctor consoles.
- Patient portal displays digital prescription slips and encounter histories isolated to the authenticated Aadhaar UID.
- ASHA dashboard renders the offline resilience banner when disconnected and syncs seamlessly upon reconnection.

Please initialize your working directory `.agents/orchestrator_1`, plan out the execution, decompose tasks across backend and frontend specialists, run build and test verifications, and report victory when complete.
