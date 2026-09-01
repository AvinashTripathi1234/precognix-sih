# Project: Precognix-SIH Rural Emergency Medical Command & Triage Terminal

## Architecture
Precognix-SIH is a high-reliability, offline-resilient rural emergency triage and clinical command platform.
- **Frontend Architecture**: React 19 SPA built on Vite 6 with Tailwind CSS v4, featuring a strict Vintage Brutalist Universal Design System (`#f5f2eb` vs `#121212`, 2px/4px borders, `rounded-none`, heavy drop shadows, mono/serif typography).
  - Multi-portal architecture:
    - **Doctor Command Center (`DoctorDashboard.jsx`)**: Strict view isolation with View A (`CommandQueue.jsx`), View B (`TriageDocket.jsx` 70/30 split), View C (`WalkInIntake.jsx`), observation ward bed allocation, and 3-minute critical SLA audio/visual telemetry (`audioAlert.js`).
    - **ASHA Field Intake (`AshaDashboard.jsx`)**: High-contrast inputs, voice dictation (Hindi `hi-IN` and Indian English `en-IN` via Web Speech API), offline resilience banner, and IndexedDB local docket buffering (`offlineQueue.js`).
    - **Citizen Self-Service Dossier (`PatientPortal.jsx`)**: Aadhaar UID isolated patient portal, active triage badge, Ayushman Bharat-compliant printable digital prescription slip (`window.print()`).
    - **Prescription & Diagnostic Module (`PrescriptionModule.jsx`)**: 12 rural formulary presets, custom drug entry, and 10 point-of-care lab test chips.
- **Backend Architecture**: Node.js/Express.js REST API with Socket.io real-time telemetry and dual-layer data persistence (PostgreSQL/Supabase primary + in-memory cache fallback store).
  - Routes: `/api/patients` (pagination, search, priority sorting), `/api/triage`, `/api/audit-logs`, `/api/patient/my-records`, `/api/triage/:id/acknowledge`, `/api/triage/:id/escalate`, `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/login`.
  - Immutable clinical audit logger (`auditLogger.js`) capturing all triage mutations, admissions, acknowledgments, and SLA escalations.
  - WebSocket event broadcaster (`triage_update`, `patient_updated`, `emergency_alert`, `critical_sla_breach`, `triage_acknowledged`, `patient_deleted`).

---

## Feature Inventory

| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|:------:|
| F1 | Multi-Role Authentication | Staff PIN auth (ASHA, Doctor, Superintendent) and 12-digit Aadhaar OTP verification with JWT tokens | M1 | Survey | VERIFIED |
| F2 | Server-Side Patient Pagination | `GET /api/patients?page=X&limit=Y` with total count and page metadata | M1 | Survey | VERIFIED |
| F3 | Live Patient Queue Search | Text query search across patient name, case ID (`TR-XXXX`), Aadhaar UID, and symptoms | M1 | Survey | VERIFIED |
| F4 | Priority Sorting & Urgency Filter | Multi-tier sorting (`Critical` > `High` > `Moderate` > `Low`) and urgency query filters | M1 | Survey | VERIFIED |
| F5 | Casualty Walk-In & Admission API | `POST /api/patients` and `PUT /api/patients/:id` supporting walk-in creation, bed allocation, and updates | M1 | Survey | VERIFIED |
| F6 | Dual-Layer Persistence Resilience | Supabase PostgreSQL synchronization with seamless fallback to in-memory store (`fallbackTriageStore`) | M1 | Survey | VERIFIED |
| F7 | Real-Time WebSocket Telemetry | Socket.io broadcasting for `triage_update`, `patient_updated`, `emergency_alert`, `critical_sla_breach` | M1 | Survey | VERIFIED |
| F8 | Immutable Clinical Audit Trail | `src/services/auditLogger.js` logging `CREATED`, `EDITED`, `ACKNOWLEDGED`, `SLA_BREACHED`, `RESOLVED` | M1 | Survey | VERIFIED |
| F9 | Doctor Command Queue (View A) | High-density vertical data table with color-coded left borders, queue time, search/filter, and direct walk-in trigger | M2 | Survey | VERIFIED |
| F10 | Triage Docket 70/30 Split (View B) | Left pane (70%): read-only demographics, vitals matrix with red alert thresholds, 5 emergency protocols, embedded Rx, 3 verdicts. Right pane (30% sticky): comorbidities and visit history | M2 | Survey | VERIFIED |
| F11 | Direct Walk-In Intake (View C) | Rapid casualty intake form bypassing ASHA metadata, with instant handoff to View B for active evaluation | M2 | Survey | VERIFIED |
| F12 | Observation Ward Bed Queue | Inpatient bed allocation and discharge controls inside Doctor Command Center | M2 | Survey | VERIFIED |
| F13 | 3-Min Critical SLA Audio/Visual Alarm | SLA countdown timer triggering Web Audio API siren (587Hz/880Hz) and dispatching `/api/triage/:id/escalate` on breach | M2 | Survey | VERIFIED |
| F14 | Essential Rural Formulary & Lab Chips | `PrescriptionModule.jsx` with 12 presets, dosage/freq/duration controls, custom entry, and 10 diagnostic lab chips | M2 | Survey | VERIFIED |
| F15 | ASHA Field Intake & Offline Sync | `AshaDashboard.jsx` with high-contrast inputs, offline banner, IndexedDB queue (`offlineQueue.js`), and auto-sync | M2 | Survey | VERIFIED |
| F16 | Voice Dictation (Hindi & English) | Web Speech API integration in `useSpeechRecognition.js` supporting `hi-IN` and `en-IN` transcription | M2 | Survey | VERIFIED |
| F17 | Citizen Portal Aadhaar Isolation | `PatientPortal.jsx` enforcing authenticated Aadhaar UID isolation (`x-patient-aadhaar` header) | M2 | Survey | VERIFIED |
| F18 | Printable Ayushman Bharat Rx Slip | ABDM-compliant digital prescription format with lab orders and `window.print()` support | M2 | Survey | VERIFIED |
| F19 | Universal Vintage Brutalist Styling | Newsprint/ink palette (`#f5f2eb`/`#121212`), 2px/4px borders, `rounded-none`, retro drop shadows, serif/mono typography | M2 | Survey | VERIFIED |
| F20 | Automated 4-Tier E2E Integration Suite | End-to-end test runner validating build gates (`npm run build`), API assertions (`test-verify.js`), and workflow integrity | M3 | Survey | VERIFIED |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|:------:|
| M1 | Backend Infrastructure & Telemetry | Express routes (`/api/patients`, `/api/triage`, `/api/audit-logs`, `/api/patient/my-records`, `/api/triage/:id/acknowledge`, `/api/triage/:id/escalate`, `/api/triage/analyze`, `/api/supabase-test`), dual-layer storage resilience, Socket.io telemetry, bed persistence | none | **DONE** |
| M2 | Frontend Clinical Command Center & Portals | DoctorDashboard (Views A/B/C isolation, 70/30 split, SLA countdown + Web Audio alarm, Ward beds), PrescriptionModule, AshaDashboard (offline detection & IndexedDB sync, voice dictation), PatientPortal (Aadhaar isolation, printable Rx slip), Vintage Brutalist styling | M1 | **DONE** |
| M3 | E2E Integration & Verification Gate | Full test suite execution: Frontend production build (`npm run build` 0 errors), Backend integration assertions (`node test-verify.js` 100% pass), 4-tier E2E verification, Reviewer/Challenger/Auditor gates | M1, M2 | **DONE** |

---

## Interface Contracts

### Backend API ↔ Frontend Consoles

#### 1. Patient Queue & Pagination
- **Endpoint**: `GET /api/patients?page={page}&limit={limit}&search={query}&urgency={tier}`
- **Request Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "TR-8841",
        "patient_name": "Ramesh Kumar",
        "age": 54,
        "gender": "M",
        "aadhaar_number": "548291038471",
        "triage_priority": "CRITICAL",
        "ai_urgency_score": "Critical",
        "clinical_data": {
          "vitals": { "bp_sys": 185, "bp_dia": 115, "heart_rate": 128, "spo2": 88, "temperature": 99.4, "gcs": 14 },
          "symptoms_text": "Crushing retrosternal chest pain...",
          "comorbidities": ["Hypertension", "Type 2 Diabetes"],
          "bed": "Bed 03"
        },
        "created_at": "2026-09-01T09:00:00Z",
        "acknowledged_at": null,
        "status": "PENDING"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2,
      "hasPrev": false,
      "hasNext": true
    }
  }
  ```

#### 2. Casualty Walk-In & Admission
- **Endpoint**: `POST /api/patients`
- **Request Body**:
  ```json
  {
    "patient_name": "Mahesh Verma",
    "age": 46,
    "gender": "Male",
    "aadhaar_number": "556677889900",
    "clinical_data": {
      "vitals": { "bp_sys": 150, "bp_dia": 95, "heart_rate": 102, "spo2": 94, "temperature": 98.6, "gcs": 15 },
      "symptoms_text": "Severe acute epigastric pain radiating to back",
      "comorbidities": ["Peptic Ulcer Disease"],
      "bed": "Bed 04"
    },
    "bed": "Bed 04",
    "triage_priority": "URGENT",
    "status": "ADMITTED"
  }
  ```
- **Response `201 Created`**: Returns created patient record with assigned `TR-XXXX` ID.
- **WebSocket Broadcast**: Emits `patient_updated` and `triage_update`.

#### 3. Doctor Triage Acknowledgment & SLA Escalation
- **Acknowledge**: `POST /api/triage/:id/acknowledge` -> Updates `acknowledged_at = now()`, emits `triage_acknowledged`.
- **Escalate**: `POST /api/triage/:id/escalate` -> Logs `SLA_BREACHED`, emits `critical_sla_breach`.

#### 4. Patient Isolated Records
- **Endpoint**: `GET /api/patient/my-records`
- **Request Headers**: `x-patient-aadhaar: 548291038471`, `x-user-role: PATIENT`
- **Response `200 OK`**: Returns array of records matching Aadhaar UID.

---

## Code Layout

```
SIH26/
├── ORIGINAL_REQUEST.md        # Verbatim original user requirements
├── PROJECT.md                 # Master project architecture & decomposition
├── TEST_INFRA.md              # E2E test strategy & verification index
├── TEST_READY.md              # Published upon test suite completion
├── GATE_STATUS.md             # Gate verdicts per milestone iteration
├── DEAD_ENDS.md               # Oscillation guard tracking
├── backend/
│   ├── package.json
│   ├── schema.sql
│   ├── test-verify.js         # Integration test verification harness
│   └── src/
│       ├── server.js          # Entry point & Socket.io server
│       ├── app.js             # Express app & route middleware
│       ├── config/supabase.js # Dual-layer persistence client
│       ├── middleware/        # auth, validate, errorHandler
│       ├── routes/            # api.js, auth.js, index.js
│       ├── services/          # auditLogger.js
│       └── sockets/           # socketHandler.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx            # Root route & auth dispatcher
        ├── index.css          # Vintage Brutalist tokens & reset
        ├── pages/
        │   ├── DoctorDashboard.jsx  # View isolation coordinator
        │   ├── AshaDashboard.jsx    # ASHA intake & offline sync
        │   ├── PatientPortal.jsx    # Aadhaar isolated citizen dossier
        │   └── Login.jsx            # Multi-role authentication portal
        ├── components/
        │   ├── CommandQueue.jsx     # View A: Table, filters, search
        │   ├── TriageDocket.jsx     # View B: 70/30 active evaluation
        │   ├── WalkInIntake.jsx     # View C: Direct casualty intake
        │   └── PrescriptionModule.jsx # Formulary presets & lab chips
        └── services/
            ├── offlineQueue.js      # IndexedDB buffer & auto-sync
            ├── audioAlert.js        # Web Audio API emergency siren
            └── supabaseService.js   # Client persistence & cache
```
