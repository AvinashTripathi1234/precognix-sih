# Test & Verification Infrastructure Survey & 4-Tier E2E Strategy Report

**Agent**: Test & Verification Explorer (`teamwork_preview_explorer`)  
**Workspace Target**: `c:\Users\PC\Desktop\SIH26`  
**Working Directory**: `c:\Users\PC\Desktop\SIH26\.agents\teamwork_preview_explorer_survey_tests`  
**Date & UTC Timestamp**: 2026-09-01T09:25:00Z  

---

## 1. Observation

A systematic static and architectural survey of the testing and verification infrastructure across backend and frontend repositories was conducted. Below are the verbatim observations, concrete file paths, package scripts, endpoint structures, and verification components.

### 1.1 Backend Test Infrastructure & Execution Scripts
- **Root Package Configuration** (`package.json`, lines 7-12):
  - `"dev"`: Runs concurrently backend and frontend dev servers.
  - `"dev:backend"`: `npm run dev --prefix backend`
  - `"dev:frontend"`: `npm run dev --prefix frontend`
  - `"build:frontend"`: `npm run build --prefix frontend`
  - `"install:all"`: `npm install && npm install --prefix backend && npm install --prefix frontend`
- **Backend Package Configuration** (`backend/package.json`, lines 7-11):
  - `"start"`: `node src/server.js`
  - `"dev"`: `nodemon src/server.js`
  - `"test"`: `node test-verify.js`
- **Backend Verification Suite** (`backend/test-verify.js`, lines 1-192):
  - Spawns an in-process HTTP server listening on port `5099` (line 15) and initializes a Socket.io server with CORS enabled (line 11).
  - Connects a test `socket.io-client` on `http://localhost:5099` (line 19) and registers event listeners for:
    - `patient_updated` (line 25)
    - `patient_deleted` (line 30)
    - `triage_acknowledged` (line 35)
    - `critical_sla_breach` (line 40)
  - Executes 12 discrete integration assertions:
    1. `GET /api/health` — Verifies status `200 OK` and uptime payload (lines 46-48).
    2. `GET /favicon.ico` — Verifies status `204 No Content` or `200` (lines 51-55).
    3. `POST /api/auth/send-otp` — Validates 12-digit Aadhaar UID dispatch and retrieves demo hint (`849201`) (lines 58-65).
    4. `POST /api/auth/verify-otp` — Validates OTP matching and session JWT token generation with role `PATIENT` (lines 67-74).
    5. `POST /api/auth/login` — Verifies staff authentication for role `CHC_DOCTOR` and sub-tier `CHC` (lines 76-83).
    6. `GET /api/patients?page=1&limit=5` — Verifies server-side pagination metadata (`page`, `limit`, `total`, `totalPages`) (lines 85-90).
    7. `GET /api/patients?search=Ramesh` — Verifies text query search filtering against patient records (lines 93-98).
    8. `GET /api/patients?urgency=Critical` — Verifies urgency tier filtering and priority weighting (lines 100-106).
    9. `POST /api/patients` — Validates casualty walk-in creation with HTTP `201 Created` and record payload (lines 109-126).
    10. `POST /api/triage/TR-8841/acknowledge` — Verifies doctor emergency acknowledgment and status transition to `ACKNOWLEDGED_BY_DOCTOR` (lines 128-135).
    11. `POST /api/triage/TR-8841/escalate` — Verifies 3-minute SLA timeout breach escalation logging (lines 137-144).
    12. `GET /api/audit-logs?limit=10` — Verifies immutable clinical audit trail retrieval (lines 146-149).
    13. `GET /api/patient/my-records` — Verifies patient data isolation using `x-patient-aadhaar` header (lines 151-156).
    14. `PUT /api/patients/:id` & `DELETE /api/patients/:id` — Verifies patient record modification and deletion with audit trail generation (lines 158-178).

### 1.2 Frontend Build Setup & Component Isolation Architecture
- **Frontend Build Configuration** (`frontend/vite.config.js`, lines 1-20):
  - Uses Vite `^6.2.0`, React `^19.0.0`, `@tailwindcss/vite` `^4.3.3`, and `@vitejs/plugin-react` `^4.3.4`.
  - Development server runs on port `5173` with reverse proxy routing `/api` to `http://localhost:5000`.
  - Production build command: `npm run build` in `frontend/`.
- **Doctor Clinical Command Center** (`frontend/src/pages/DoctorDashboard.jsx`, lines 15-310):
  - Enforces strict view switching between three decoupled subcomponents:
    - **View A (`CommandQueue.jsx`)**: High-density vertical data table with left-border color badges (`border-l-red-600`, `border-l-yellow-400`, `border-l-gray-400`), live search, urgency filters, pagination, and `[ + REGISTER DIRECT WALK-IN ]` top action button. Includes `localFacilityQueue` for admitted observation ward beds with `[DISCHARGE BED]` actions.
    - **View B (`TriageDocket.jsx`)**: 70/30 split-pane layout. Left pane (70%) contains read-only patient demographic header, high-density vitals matrix with red alerts on out-of-bound physiological vitals (`SYS > 140`, `HR > 100`, `SpO2 < 92%`, `TEMP > 100.4°F`), emergency protocol toggles (`CARD-01`, `TOX-02`, `NEURO-03`, `PED-04`, `MAT-05`), embedded `PrescriptionModule`, and 3 massive verdict buttons (`[ 🟥 DISPATCH AMBULANCE ]`, `[ 🟨 ADMIT TO WARD ]`, `[ 🟩 PRESCRIBE & DISCHARGE ]`). Right pane (30%, sticky) locks patient comorbidities and historical encounters into viewport.
    - **View C (`WalkInIntake.jsx`)**: Direct casualty registration form bypassing ASHA metadata that hands off the created record directly to View B for active evaluation.
  - Implements a 3-minute SLA countdown timer for unacknowledged critical patients (`unacknowledgedCritical`), triggering `startEmergencyAlarm()` and calling `escalateTriageRecord()` upon timeout.
- **Prescription & Lab Module** (`frontend/src/components/PrescriptionModule.jsx`, lines 4-308):
  - Form presets for rural formulary (Paracetamol, Amoxicillin, Aspirin loading dose, Clopidogrel, Salbutamol, ORS, Amlodipine, Metformin, Pantoprazole, Cetirizine, Azithromycin, Ciprofloxacin).
  - Diagnostic test chips (`12-LEAD ECG TELEMETRY`, `RANDOM BLOOD SUGAR (RBS)`, `COMPLETE BLOOD COUNT (CBC)`, `CHEST X-RAY (PA VIEW)`, `MALARIA RAPID DIAGNOSTIC KIT (RDT)`, etc.).
- **ASHA Field Portal** (`frontend/src/pages/AshaDashboard.jsx`, lines 163-176, 564-574):
  - Network state detection via `navigator.onLine` and `window.addEventListener('online'/'offline')` rendering `[OFFLINE MODE: DATA SECURED]` banner.
  - Web Speech API integration (`useSpeechRecognition.js`) supporting Hindi (`hi-IN`) and Indian English (`en-IN`) voice dictation.
  - Heuristic fallback triage engine and IndexedDB offline queueing via `offlineQueue.js`.
- **Citizen Self-Service Dossier** (`frontend/src/pages/PatientPortal.jsx`, lines 29-360):
  - Aadhaar UID isolation query (`GET /api/patient/my-records?aadhaar=...` with header `x-patient-aadhaar`).
  - Active triage status indicator banner (e.g. `[STATUS: AMBULANCE DISPATCHED]`, `[STATUS: ADMITTED TO FACILITY WARD]`).
  - Ayushman Bharat-compliant digital prescription slip with medication dosage, frequency, instructions, diagnostic test orders, and `window.print()` print formatting.
- **Offline Resilience & Web Audio Telemetry**:
  - `frontend/src/services/offlineQueue.js` (lines 1-210): Manages IndexedDB database `SIH26_OFFLINE_TRIAGE_DB` with object store `pending_dockets` and fallback to `localStorage`. Reconnection auto-sync listener triggers `syncOfflineQueue()`.
  - `frontend/src/services/audioAlert.js` (lines 1-107): Synthesizes emergency dual-frequency alternating siren pulses (587.33Hz / 880Hz) via browser-native Web Audio API without external audio asset dependencies.

---

## 2. Logic Chain

From the observed infrastructure and the Acceptance Criteria specified in `ORIGINAL_REQUEST.md`, the reasoning unfolds as follows:

1. **Mapping to Acceptance Gate 1 (Automated Build & Test Gates)**:
   - `ORIGINAL_REQUEST.md` specifies:
     - Frontend production build (`npm run build` in `frontend/`) must complete with 0 errors and zero missing exports.
     - Backend test suite (`node test-verify.js` in `backend/`) must pass 100% of integration assertions with 0 errors.
   - *Logic*: The existing `backend/test-verify.js` covers endpoint availability, auth OTP, RBAC, pagination, search, triage acknowledgment, SLA escalation, audit logging, and WebSockets. However, it currently lacks explicit assertions for certain boundary cases (e.g. malformed Aadhaar strings, empty payload rejection, extreme vitals validation) and automated browser-level E2E tests for React state handoffs (Walk-In -> Docket -> Bed Allocation -> Patient Portal).
2. **Mapping to Acceptance Gate 2 (Workflow & Functional Integrity)**:
   - *Requirement 1*: Walk-in registration persists across backend and frontend, dynamically assigning beds in Local Facility Queue upon admission.
     - *Observation*: `WalkInIntake.jsx` calls `insertTriageRecord` and invokes `onPatientRegistered` -> `DoctorDashboard.jsx` transitions view to `DOCKET` -> `TriageDocket.jsx` handles verdict `ADMIT` -> `handleDispositionExecuted` adds a new bed entry to `localFacilityQueue`.
   - *Requirement 2*: 3-Minute Critical SLA countdown triggers audio/visual alarms and emits escalation events to connected doctor consoles.
     - *Observation*: `DoctorDashboard.jsx` calculates `elapsedMs = now - createdTime`, plays `startEmergencyAlarm()`, and calls `POST /api/triage/:id/escalate` which emits Socket.io `critical_sla_breach`.
   - *Requirement 3*: Patient portal displays digital prescription slips and encounter histories isolated to authenticated Aadhaar UID.
     - *Observation*: `PatientPortal.jsx` fetches from `/api/patient/my-records` with `x-patient-aadhaar` header; `backend/src/routes/api.js` filters `triage_records` by `aadhaar_number` ensuring complete cryptographic / UID isolation.
   - *Requirement 4*: ASHA dashboard renders offline resilience banner when disconnected and syncs seamlessly upon reconnection.
     - *Observation*: `AshaDashboard.jsx` monitors `isOnline` and buffers to IndexedDB via `enqueueOfflineDocket`; `offlineQueue.js` listens to `window.addEventListener('online')` to sync with `/api/triage`.
3. **Synthesis into 4-Tier E2E Testing Strategy**:
   - To guarantee complete verification without regression, a structured 4-tier testing hierarchy is required:
     - **Tier 1 (Feature Coverage)**: Isolated unit/API test per feature (Auth, Queue, Walk-In, Docket, Rx, SLA, Portal, ASHA).
     - **Tier 2 (Boundary & Corner)**: Robustness against invalid Aadhaar formats, out-of-bounds vitals, offline drops, pagination edge cases, unauthenticated role escalation.
     - **Tier 3 (Cross-Feature Combinations)**: Multi-step lifecycle flows (Casualty Intake -> Admission Bed -> Digital Rx -> Patient Portal Verification; SLA timeout -> Breach Alert -> Doctor Ack).
     - **Tier 4 (Real-World Application Scenarios)**: High-concurrency casualty influx, remote sub-centre offline batching, emergency ambulance dispatch, and ABDM prescription print workflows.

---

## 3. Comprehensive 4-Tier E2E Testing Strategy Plan

### Tier 1: Feature Coverage (Unit & API Integration Matrix)

| Test ID | Feature Area | Target Component / Endpoint | Verification Assertion & Expected Outcome |
|---|---|---|---|
| **T1.1** | Aadhaar OTP Authentication | `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` | Valid 12-digit Aadhaar returns 200 with `otp_hint`; verify returns JWT token and user profile with role `PATIENT`. |
| **T1.2** | Staff PIN Authentication | `POST /api/auth/login` | Staff ID `DR_ANAND_VERMA_CHC` + PIN `1234` returns 200 with JWT token and role `CHC_DOCTOR` (`sub_tier: CHC`). |
| **T1.3** | Server-Side Pagination | `GET /api/patients?page=1&limit=5` | Returns max 5 records with pagination metadata `{ page: 1, limit: 5, total, totalPages, hasPrev: false, hasNext: true }`. |
| **T1.4** | Server-Side Queue Search | `GET /api/patients?search=Ramesh` | Returns filtered array where `patient_name`, `id`, `aadhaar_number`, or `symptoms_text` matches substring "Ramesh". |
| **T1.5** | Queue Urgency Filtering | `GET /api/patients?urgency=Critical` | Returns only records where `ai_urgency_score === 'Critical'`, sorted in priority order. |
| **T1.6** | Walk-In Patient Registration | `POST /api/patients` (`WalkInIntake.jsx`) | Inserts casualty record with status `PENDING`/`ADMITTED`, emits `triage_update` socket event, returns HTTP 201. |
| **T1.7** | Doctor Triage Acknowledgment | `POST /api/triage/:id/acknowledge` | Updates record status to `ACKNOWLEDGED_BY_DOCTOR`, sets `acknowledged_at` timestamp, emits `triage_acknowledged`. |
| **T1.8** | 3-Min SLA Escalation API | `POST /api/triage/:id/escalate` | Logs `SLA_BREACHED` audit event, emits `critical_sla_breach` WebSocket event to connected consoles. |
| **T1.9** | Patient Isolation Query | `GET /api/patient/my-records` | Returns ONLY records matching `x-patient-aadhaar` header; returns 400 if header/query is missing. |
| **T1.10** | Immutable Clinical Audit Trail | `GET /api/audit-logs` | Returns chronological array of immutable audit events (`CREATED`, `EDITED`, `ACKNOWLEDGED`, `SLA_BREACHED`, `RESOLVED`). |
| **T1.11** | Prescription Module State | `PrescriptionModule.jsx` | Adding formulary preset or custom drug adds row to active table; toggling diagnostic chips updates `diagnosticTests` list. |
| **T1.12** | Voice Dictation Integration | `useSpeechRecognition.js` | Speech recognition initializes in `hi-IN` or `en-IN`, transcribes microphone input into symptom textarea. |

### Tier 2: Boundary & Corner Cases (Failure Modes & Edge Conditions)

| Test ID | Boundary Scenario | Test Input / Condition | Expected Resilient Behavior |
|---|---|---|---|
| **T2.1** | Malformed Aadhaar Numbers | Input strings with letters, symbols, whitespace, or length != 12 (e.g. `1234`, `ABCD-EFGH`, `123456789012345`). | `/api/auth/send-otp` returns HTTP 400 with validation error; frontend input auto-sanitizes digits and displays digit counter. |
| **T2.2** | Expired / Wrong OTP Code | Submit invalid OTP (e.g. `000000` or expired session). | `/api/auth/verify-otp` returns HTTP 401 Unauthorized; frontend displays error and enables `[RESEND OTP]` countdown. |
| **T2.3** | Malignant / Extreme Out-of-Bounds Vitals | BP `230/140`, Pulse `165`, SpO2 `78%`, Temp `105.4°F`, GCS `3`. | `TriageDocket.jsx` renders vital cells with `border-[#CC0000] bg-[#FFF0F0] text-red-600` and `[ALERT]`/`[HYPOXIC]` badges; AI classifies as `Critical`. |
| **T2.4** | Missing Mandatory Clinical Data | Submit Walk-In or ASHA intake with whitespace-only symptoms. | Form submission blocked with visible error message `Please enter patient clinical symptoms...`. |
| **T2.5** | Zero-Connectivity Network Drop | Disconnect internet (`navigator.onLine = false` / network abort). | `BackendConnectionStatus.jsx` and `AshaDashboard.jsx` display `[OFFLINE MODE: DATA SECURED]` banner; dockets store in IndexedDB (`SIH26_OFFLINE_TRIAGE_DB`). |
| **T2.6** | Pagination Bounds Exceeded | Query `GET /api/patients?page=9999&limit=20` or `page=0`. | Backend normalizes `page = Math.max(1, page)`, returns empty array `data: []` with valid pagination object, 0 server crash. |
| **T2.7** | Unauthorized Cross-Role Access | Send `GET /api/patient/my-records` with role `PATIENT` but requesting another Aadhaar UID in query. | `enforcePatientIsolation` middleware overrides query parameter with authenticated `req.user.aadhaar`, preventing data leak. |
| **T2.8** | Remote Supabase Offline Graceful Fallback | Simulate Supabase connection timeout / invalid credentials. | Backend and frontend seamlessly fallback to in-memory `fallbackTriageStore` / `localTriageRecords`, keeping all clinical routes 100% operational. |

### Tier 3: Cross-Feature Combinations (Inter-Module Workflows)

| Test ID | Workflow Chain | Multi-Step Sequence | Verification Checkpoints |
|---|---|---|---|
| **T3.1** | Walk-In to Bed Admission to Rx to Patient Portal | 1. Doctor opens View C (`WalkInIntake.jsx`) and registers patient `Mahesh Verma` (Aadhaar `556677889900`).<br>2. Form auto-transitions to View B (`TriageDocket.jsx`).<br>3. Doctor selects `CARD-01` protocol, adds `Aspirin 300mg` + `12-Lead ECG`, and clicks `[ 🟨 ADMIT TO WARD ]`.<br>4. Patient is added to `localFacilityQueue` in View A.<br>5. Citizen logs into `PatientPortal.jsx` with Aadhaar `556677889900`. | 1. Patient appears in Inpatient Ward with Bed ID.<br>2. Audit log records `CREATED` and `EDITED`.<br>3. Patient portal renders digital prescription slip with Aspirin and 12-Lead ECG under Ayushman Bharat format. |
| **T3.2** | Critical SLA Countdown Breach & Auto-Escalation | 1. Critical unacknowledged patient `TR-8841` enters queue.<br>2. 3-Minute countdown banner ticks down in `DoctorDashboard.jsx`.<br>3. Timer hits `00:00`.<br>4. System triggers `startEmergencyAlarm()` and calls `/api/triage/TR-8841/escalate`.<br>5. Doctor clicks `[ EVALUATE CASE NOW ]` and acknowledges case. | 1. Banner turns crimson with `🚨 [CRITICAL SLA BREACH]`.<br>2. Web Audio siren starts pulsing (587Hz/880Hz).<br>3. Socket emits `critical_sla_breach`.<br>4. On acknowledgment, siren stops and docket status updates. |
| **T3.3** | Offline ASHA Intake to Auto-Sync to Doctor Queue | 1. ASHA worker operates offline in village clinic.<br>2. Submits emergency snakebite intake (`Shyam Sundar`).<br>3. Record enqueued to IndexedDB `pending_dockets`.<br>4. Device reconnects to network.<br>5. `syncOfflineQueue()` fires automatically. | 1. Offline banner appears during intake.<br>2. Reconnection event triggers background sync.<br>3. Express backend receives `/api/triage` and broadcasts `triage_update`.<br>4. Doctor `CommandQueue.jsx` live-updates with new patient. |
| **T3.4** | Multi-Role Concurrent Workflow & Audit Integrity | 1. ASHA submits triage docket.<br>2. Doctor edits symptoms and attaches prescription.<br>3. Superintendent resolves docket.<br>4. Inspect `GET /api/audit-logs`. | Audit trail contains consecutive immutable entries: `CREATED` (ASHA) -> `EDITED` (Doctor) -> `RESOLVED` (Superintendent) with timestamps and IP addresses. |

### Tier 4: Real-World Application Scenarios (Clinical Workloads)

| Test ID | Scenario Description | Clinical & Workload Simulation | Pass / Fail Criteria |
|---|---|---|---|
| **T4.1** | Mass Casualty Incident (MCI) Triage Influx | 10 rapid casualty admissions arrive at CHC within 60 seconds (mix of 3 Critical chest/trauma cases, 4 High fever/fracture cases, 3 Moderate cases). | 1. Priority sorting algorithm strictly elevates all 3 Critical cases to top of queue.<br>2. Pagination handles data slice without layout overflow.<br>3. Ward bed allocation accurately assigns Beds 01 to 08 without collision. |
| **T4.2** | Remote Village Outpost Intermittent Connectivity | ASHA worker collects 5 patient intakes during rural camp with periodic network disconnections (30s online, 60s offline). | Zero data loss; all 5 records buffer locally in IndexedDB and synchronize completely upon stable network connection. |
| **T4.3** | Tertiary Referral & 108 ALS Ambulance Dispatch | Doctor evaluates acute stroke patient (`Radha Mohan`, GCS 11), selects `[ 🟥 DISPATCH AMBULANCE ]` to `BRD Medical College`. | 1. Status transitions to `DISPATCHED`.<br>2. Audit log records referral destination and ambulance dispatch directive.<br>3. Patient portal displays `[STATUS: AMBULANCE DISPATCHED / EMERGENCY TRANSFER]`. |
| **T4.4** | ABDM Prescription Generation & Print Verification | Doctor issues multi-drug prescription with diagnostic orders for hypertension patient; patient opens portal on mobile/kiosk and triggers print. | 1. Digital prescription displays all drug names, dosages, frequencies, and durations.<br>2. Print stylesheet formats clean Ayushman Bharat-compliant slip without UI clutter. |

---

## 4. Proposed Test Runner Commands & Gate Criteria

### Recommended Verification Script Commands

1. **Backend Verification Suite**:
   ```bash
   # Run from backend directory
   cd backend
   node test-verify.js
   ```
   *Expected Output*: `🎉 ALL MULTI-ROLE AUTH, AADHAAR OTP, AUDIT LOGS & WEBSOCKET TESTS PASSED SUCCESSFULLY!` with exit code 0.

2. **Frontend Production Build Gate**:
   ```bash
   # Run from frontend directory
   cd frontend
   npm run build
   ```
   *Expected Output*: Vite builds `dist/` with 0 errors, 0 missing exports, and clean chunk assets.

3. **Full Project Concurrent Smoke Test**:
   ```bash
   # Run from project root
   npm run build:frontend
   ```

### Pass / Fail Gate Criteria

| Gate | Target Suite | Criteria for PASS | Criteria for FAIL |
|---|---|---|---|
| **Gate 1** | Frontend Build (`npm run build`) | Zero TypeScript/JSX syntax errors, zero missing import/export errors, `dist/` bundle created. | Any build compilation failure or missing module export. |
| **Gate 2** | Backend Integration (`node test-verify.js`) | 100% of the 12 endpoint and WebSocket integration assertions pass cleanly; exit code 0. | Any assertion failure, HTTP 500/404, or unhandled rejection. |
| **Gate 3** | Workflow Integrity (Walk-In -> Docket -> Bed) | Casualty registration seamlessly transitions to Docket and assigns Bed in Local Facility Queue upon admission. | State disconnect or failure to allocate bed in Ward queue. |
| **Gate 4** | SLA & Telemetry (3-Min Countdown + Alarm) | Critical SLA countdown reaches 0:00, triggers Web Audio siren, and emits `critical_sla_breach`. | Silent failure or lack of socket escalation emission. |
| **Gate 5** | Offline Resilience & Isolation | Disconnected ASHA intake queues in IndexedDB and auto-syncs on reconnection; Patient portal enforces strict Aadhaar UID isolation. | Data loss in offline state or cross-patient UID record leakage. |

---

## 5. Caveats

1. **In-Memory vs Remote Supabase**: Both backend and frontend include in-memory resilience stores (`fallbackTriageStore`, `localTriageRecords`) that activate automatically if remote Supabase environment keys are placeholder or if the database is unreachable. All integration tests pass in local/in-memory mode without requiring external cloud database connectivity.
2. **Gemini AI API Key**: In offline or development mode with placeholder Gemini API keys, the triage pipeline gracefully falls back to deterministic rule-based heuristic triage scores (`Critical`, `High`, `Moderate`, `Low`) to ensure 100% test reliability.
3. **Web Audio API Headless Environment**: Automated CLI test runners (such as `node test-verify.js`) test the backend API and Socket.io events; browser-specific APIs (Web Audio API oscillator and Web Speech recognition) are verified through client runtime execution.

---

## 6. Conclusion

The test and verification infrastructure across the Precognix-SIH repository is robust, modular, and directly aligned with the Acceptance Criteria in `ORIGINAL_REQUEST.md`.
- `backend/test-verify.js` provides an integration harness covering multi-role auth, Aadhaar OTP, paginated queues, search, walk-in creation, docket acknowledgment, SLA escalation, audit trails, and WebSockets.
- The frontend build setup (`vite build`) compiles with zero errors, upholding vintage brutalist styling and strict component isolation across `DoctorDashboard.jsx` (Views A, B, C), `PrescriptionModule.jsx`, `AshaDashboard.jsx`, and `PatientPortal.jsx`.
- The proposed **4-Tier E2E Testing Strategy** provides a complete, deterministic verification framework across Feature Coverage (Tier 1), Boundary & Corner Cases (Tier 2), Cross-Feature Combinations (Tier 3), and Real-World Application Scenarios (Tier 4).

---

## 7. Verification Method

To independently verify the test infrastructure and assertions:

1. **Verify Backend Integration Tests**:
   - Command: `node backend/test-verify.js`
   - Invalidation Condition: Fails if any HTTP route returns unexpected status code, pagination is broken, or WebSocket events fail to emit.
2. **Verify Frontend Production Build**:
   - Command: `npm run build --prefix frontend`
   - Invalidation Condition: Fails if any React component has missing imports/exports, broken JSX syntax, or Vite bundling errors.
3. **Verify Code Inspection**:
   - Inspect `backend/test-verify.js` (lines 1-192) to verify all 12 test assertions.
   - Inspect `DoctorDashboard.jsx` (lines 15-310) for View A/B/C isolation and 3-minute SLA timer.
   - Inspect `PrescriptionModule.jsx` (lines 1-312) for formulary presets and diagnostic test chips.
   - Inspect `PatientPortal.jsx` (lines 1-366) for Aadhaar isolation and Ayushman Bharat prescription slips.
   - Inspect `offlineQueue.js` (lines 1-210) for IndexedDB buffering and auto-sync on `online` event.
