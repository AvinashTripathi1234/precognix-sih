# Frontend UI Survey & Architectural Handoff Report

**Agent Archetype**: Frontend UI Exploration Specialist (`teamwork_preview_explorer_survey_frontend_2`)  
**Mission**: Comprehensive survey of frontend codebase (`frontend/` directory, React/Vite architecture, R2 Clinical Command Center & Modular Portals, component isolation, design tokens, and test readiness) against `ORIGINAL_REQUEST.md`.  
**Timestamp**: 2026-09-01T09:45:00Z  

---

## 1. Observation

A complete, exhaustive read-only inspection of all 44 source files and configurations in `frontend/` was performed.

### 1.1 Project Structure & Build Configuration
- **Package Manifest** (`frontend/package.json`):
  - Dependencies: React 19 (`react: ^19.0.0`, `react-dom: ^19.0.0`), React Router DOM v7 (`react-router-dom: ^7.2.0`), Socket.io Client (`socket.io-client: ^4.8.1`), Supabase JS (`@supabase/supabase-js: ^2.49.1`), Lucide React (`lucide-react: ^1.16.0`), Tailwind utilities (`clsx: ^2.1.1`, `tailwind-merge: ^3.6.0`, `class-variance-authority: ^0.7.1`).
  - Build Engine: Vite 6 (`vite: ^6.2.0`, `@vitejs/plugin-react: ^4.3.4`), Tailwind CSS v4 (`tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`).
- **Vite Configuration** (`frontend/vite.config.js`):
  - Integrates `@vitejs/plugin-react` and `@tailwindcss/vite`.
  - Development proxy configured: `/api` -> `http://localhost:5000`.
- **HTML & Typography** (`frontend/index.html`):
  - Preconnects Google Fonts: *EB Garamond* (editorial serif), *Inter* (high-contrast sans-serif), and *JetBrains Mono* (monospaced clinical telemetry).
  - Background defaulted to `#F9F9F7` and foreground to `#111111`.

---

### 1.2 Clinical Command Center: Doctor Workflow (`DoctorDashboard.jsx`)
Located at `frontend/src/pages/DoctorDashboard.jsx` (314 lines), with backward-compatible alias at `frontend/src/pages/MedicalTriageDashboard.jsx` and `frontend/src/components/MedicalTriageDashboard.jsx`:
- **Strict Component Isolation**:
  - Controlled via `activeView` state: `'QUEUE'` (View A) | `'DOCKET'` (View B) | `'WALK_IN'` (View C).
  - Only one primary view is mounted at a time in the main viewport, preventing any visual bleed or DOM overlap.
- **View A: The Command Console Queue (`src/components/CommandQueue.jsx` - 343 lines)**:
  - **Top Action Bar** (lines 21-31): Massive full-width trigger `[ + REGISTER DIRECT WALK-IN PATIENT (CASUALTY INTAKE) ]` with `shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`.
  - **Sticky Search & Urgency Filter Bar** (lines 33-107): Live uppercase search by patient name, case ID (`TR-XXXX`), Aadhaar UID, or symptoms. 4 discrete brutality filter buttons: `[ ALL PATIENTS ]`, `[ 🚨 CRITICAL ]` (`#CC0000`), `[ 🟨 URGENT ]` (`#E5A000`), `[ 🟩 ROUTINE ]` (`#555555`).
  - **High-Density Vertical Table** (lines 109-247):
    - Color-coded left borders: `border-l-8 border-l-red-600` for Critical cases, `border-l-8 border-l-yellow-400` for Urgent cases, and `border-l-8 border-l-gray-400` for Routine cases.
    - Columns: `TRIAGE ALERT`, `PATIENT IDENTITY`, `PHYSIOLOGICAL VITALS`, `CHIEF COMPLAINT & PRESENTATION`, `TIME IN QUEUE`, `EVALUATION`.
    - Explicit time in queue calculation (`new Date(p.created_at).toLocaleTimeString()`).
  - **Pagination Controls** (lines 249-279): Server-synchronized pagination displaying `PAGE X OF Y`, `[ < PREV ]`, and `[ NEXT > ]`.
  - **Local Facility Queue (Observation Beds)** (lines 281-340): Second table rendering admitted inpatient ward beds with patient details, admission diagnosis, vitals summary, and `[DISCHARGE BED]` action.
- **View B: Split-Pane Active Evaluation Triage Docket (`src/components/TriageDocket.jsx` - 508 lines)**:
  - **70/30 Asymmetric Split-Pane Layout** (lines 238-505): Implemented via Tailwind `grid grid-cols-1 lg:grid-cols-12 gap-6`, allocating 8 columns (`lg:col-span-8` ≈ 66.7–70%) for Left Active Data and 4 columns (`lg:col-span-4` ≈ 30–33.3%) for Right Sticky Archive.
  - **Left Pane (70%) Components**:
    1. *Read-Only Bold Demographics* (lines 244-262): Full-bleed name header, age/gender, docket ID, and masked Aadhaar badge. All editing disabled.
    2. *Physiological Vitals Matrix* (lines 264-364): High-density grid rendering NIBP, HR, SpO2, Temp, and GCS. Out-of-bounds metrics (e.g. SpO2 < 92%, BP > 140/90, HR > 100, Temp > 100.4°F, GCS < 15) trigger immediate high-contrast alert styling (`border-2 border-[#CC0000] bg-[#FFF0F0] text-red-600` and `ALERT` / `HYPOXIC` / `FEVER` badges).
    3. *Chunky Emergency Protocol Toggles* (lines 201-233): 5 standardized clinical protocols (`CARD-01: ACS / Chest Pain`, `TOX-02: Snake Envenomation`, `NEURO-03: Acute Stroke / CVA`, `PED-04: Pediatric Stridor`, `MAT-05: Eclampsia in Labour`). Clicking a protocol tag injects default recommended medications and lab test orders into the docket.
    4. *Embedded Prescription Module* (lines 378-385): Direct integration of `PrescriptionModule.jsx`.
    5. *Three Massive Verdict Disposition Buttons* (lines 388-426):
       - `[ 🟥 DISPATCH AMBULANCE ]` (`bg-[#CC0000] text-white`)
       - `[ 🟨 ADMIT TO WARD ]` (`bg-[#E5A000] text-black`)
       - `[ 🟩 PRESCRIBE & DISCHARGE ]` (`bg-[#008844] text-white`)
  - **Right Pane (30%, Sticky)** (lines 429-504):
    - Locked in viewport with `sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto`.
    - Displays pre-existing chronic comorbidities & surgical history, target specialty recommendation, immutable historical visit timeline (`MOCK_HISTORICAL_VISITS`), and `[ 📋 COPY DOCKET SUMMARY ]` clipboard utility.
- **View C: Direct Casualty Walk-In Intake (`src/components/WalkInIntake.jsx` - 372 lines)**:
  - Bypasses ASHA field metadata for rapid casualty intake.
  - Comprehensive form capturing: Name, Age, Gender, 12-digit Aadhaar UID (with auto 4-digit spacing), Vitals (Sys BP, Dia BP, Pulse, SpO2, Temp, GCS score), Chief Presenting Symptoms, and Chronic Comorbidities.
  - Submitting executes `handleSubmitWalkIn` (lines 42-101), saves to backend/Supabase via `insertTriageRecord`, and invokes `onPatientRegistered(saved)` which immediately transitions `DoctorDashboard` to View B (`setActiveView('DOCKET')`) for active doctor evaluation.
- **3-Minute Critical SLA Countdown & Audio/Visual Alarms**:
  - Monitored in `DoctorDashboard.jsx` (lines 118-157 & 220-265).
  - Unacknowledged critical cases (`triage_priority === 'CRITICAL'` and `!acknowledged_at`) trigger a 180-second countdown banner with remaining time.
  - Upon SLA timeout (0s), `isSlaBreached` turns true, activating high-urgency alternating tone audio sirens via `startEmergencyAlarm()` (`src/services/audioAlert.js`), flashing a red warning banner, and triggering `escalateTriageRecord(id)` API call.

---

### 1.3 Prescription & Diagnostic Module (`PrescriptionModule.jsx`)
Located at `frontend/src/components/PrescriptionModule.jsx` (312 lines):
- **12 Essential Rural Healthcare Formulary Presets** (lines 4-17):
  1. *Paracetamol* (500mg, TDS, 3 Days)
  2. *Amoxicillin + Clavulanic Acid* (625mg, BD, 5 Days)
  3. *Aspirin Loading Dose* (300mg, Stat, Single dose)
  4. *Clopidogrel Loading Dose* (300mg, Stat, Single dose)
  5. *Salbutamol Nebulization* (2.5mg / 2.5ml, SOS / Q4H, 1 Day)
  6. *ORS (Oral Rehydration Salts)* (1 Sachet in 1L Water, Frequent sips, 2 Days)
  7. *Amlodipine* (5mg, OD, 30 Days)
  8. *Metformin* (500mg, BD, 30 Days)
  9. *Pantoprazole* (40mg, OD, 5 Days)
  10. *Cetirizine* (10mg, HS, 3 Days)
  11. *Azithromycin* (500mg, OD, 3 Days)
  12. *Ciprofloxacin Eye/Ear Drops* (2 Drops, TDS, 5 Days)
- **Form Controls & Custom Entry** (lines 123-231): Quick-select dropdown, custom drug name input, dosage, frequency, duration, and special clinical instructions/food precautions.
- **Interactive Active Prescriptions Table** (lines 234-279): High-contrast table with medication removal controls.
- **10 Diagnostic & Point-of-Care Lab Test Chips** (lines 19-30 & 281-309):
  `12-LEAD ECG TELEMETRY`, `RANDOM BLOOD SUGAR (RBS)`, `COMPLETE BLOOD COUNT (CBC)`, `CHEST X-RAY (PA VIEW)`, `MALARIA RAPID DIAGNOSTIC KIT (RDT)`, `SPUTUM CBNAAT / GENEXPERT`, `SERUM ELECTROLYTES & RENAL PANEL`, `URINE ROUTINE & MICROSCOPY`, `RAPID TROPONIN-I CARDIAC BIOMARKER`, `ULTRASOUND (FAST / ABDOMEN)`.
  Features single-click toggle with visual `✓` active feedback and item count indicator.

---

### 1.4 ASHA Field Intake (`AshaDashboard.jsx`)
Located at `frontend/src/pages/AshaDashboard.jsx` (1506 lines), re-exported at `frontend/src/components/AshaDashboard.jsx`:
- **High-Contrast Input Matrix**: Demographics, Aadhaar UID auto-formatter, symptoms textarea, and high-contrast optional telemetry matrix (NIBP, HR, SpO2, Temp, GCS).
- **Voice Dictation Integration**: Native Web Speech API integration via `useSpeechRecognition` hook (`src/hooks/useSpeechRecognition.js`) supporting real-time speech transcription with seamless toggle between Hindi (`hi-IN`) and Indian English (`en-IN`).
- **Offline Network Detection**: Listens to browser `online` / `offline` events and renders a high-contrast banner: `[OFFLINE MODE: DATA SECURED] — NO CELLULAR / INTERNET CONNECTION DETECTED. TRIAGE DOCKETS QUEUED TO ENCRYPTED INDEXEDDB` (lines 564-574).
- **IndexedDB Offline Queue & Auto-Sync**: Managed by `src/services/offlineQueue.js` (`DB_NAME = 'SIH26_OFFLINE_TRIAGE_DB'`). If offline, triage assessments are saved to IndexedDB and automatically dispatched to backend upon network reconnection (`window.addEventListener('online', ...)`).
- **Emergency Case Presets**: 5 one-click scenario presets (`CARD-01`, `TOX-02`, `FEV-03`, `PEDS-04`, `CAT-05`).
- **Referral Facility Routing**: Integrated with `FacilityDirectory.jsx` (`src/components/FacilityDirectory.jsx`) providing GPS-based Haversine distance, ETA calculation, and hospital dispatch confirmation.

---

### 1.5 Citizen Self-Service Dossier (`PatientPortal.jsx`)
Located at `frontend/src/pages/PatientPortal.jsx` (366 lines):
- **Verified Aadhaar UID Isolation**:
  - Gated by `getCurrentSession()` from `authService.js`.
  - Queries `GET /api/patient/my-records?aadhaar=${aadhaar}` passing `x-patient-aadhaar` and `x-user-role: PATIENT` headers.
  - Strictly displays only encounters and prescriptions tied to the authenticated citizen's UID.
- **Active Triage Status Badge** (lines 227-248): High-contrast status indicator (`🚨 [STATUS: AMBULANCE DISPATCHED / EMERGENCY TRANSFER]`, `🟨 [STATUS: ADMITTED TO FACILITY WARD]`, or `[STATUS: DISCHARGED]`).
- **Ayushman Bharat-Compliant Digital Prescription Slip** (lines 262-341):
  - Official Rx header format with medication name, dosage, frequency, duration, and instructions.
  - Attached lab orders section.
  - Dual printing triggers: `[ PRINT RX SLIP ]` and top `[ PRINT PATIENT DOSSIER ]` executing `window.print()`.

---

### 1.6 Universal Vintage Brutalist Design System
- **Color Palette**: Newsprint background `#f5f2eb` / `#F9F9F7`, dense ink black `#121212` / `#111111`, emergency red `#CC0000`, warning amber `#E5A000` / `#FFCC00`, clinical green `#008844`.
- **Borders & Radii**: Strict `border-2 border-black dark:border-white`, `border-4 border-black dark:border-white`. `rounded-none` enforced globally via `* { border-radius: 0 !important; }` in `index.css`.
- **Shadows**: Heavy retro brutalist drop shadows (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`, `shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`, `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`).
- **Typographic Hierarchy**:
  - Headers, body text & editorial narrative: *EB Garamond* (`font-serif`).
  - Clinical telemetry, vitals, IDs, tags, counters, buttons: *JetBrains Mono* (`font-mono`).
  - Section subheaders, field labels, protocol tags: *Inter* (`font-sans`).

---

## 2. Logic Chain

The frontend system architecture follows a clean, decoupled design:

```
                  ┌───────────────────────────────────────────────────────────┐
                  │                 App.jsx (Root Gatekeeper)                 │
                  │  Checks authSession (localStorage / sih26_auth_changed)   │
                  └─────────────┬───────────────────────────────┬─────────────┘
                                │                               │
                   [No Active Session]               [Active Session by Role]
                                │                               │
                  ┌─────────────▼─────────────┐     ┌───────────▼───────────┐
                  │        Login.jsx          │     │    Role Dispatcher    │
                  │  - ASHA Pin Authentication│     └─┬───────────┬───────┬─┘
                  │  - Doctor Institutional ID│       │           │       │
                  │  - Patient Aadhaar OTP    │       │           │       │
                  └───────────────────────────┘       │           │       │
                                                      │           │       │
                 ┌────────────────────────────────────┘           │       └───────────────────────────────────┐
                 │                                                │                                           │
  ┌──────────────▼──────────────┐                 ┌───────────────▼───────────────┐           ┌───────────────▼───────────────┐
  │      AshaDashboard.jsx      │                 │      DoctorDashboard.jsx      │           │       PatientPortal.jsx       │
  │ - Voice Dictation (hi/en)   │                 │ - 3-Min Critical SLA Monitor  │           │ - Aadhaar-Scoped Isolation    │
  │ - Web Speech API            │                 │ - Audio Siren Web Audio API   │           │ - Encounter History Archive   │
  │ - IndexedDB Offline Queue   │                 └─┬─────────────┬─────────────┬─┘           │ - Active Disposition Badge    │
  │ - Offline Banner Detection  │                   │             │             │             │ - Ayushman Bharat Rx Slip     │
  │ - Proximity Hospital Routing│             (View A)        (View B)      (View C)          │ - window.print() Support      │
  └─────────────────────────────┘                   │             │             │             └───────────────────────────────┘
                                       ┌────────────▼──┐   ┌──────▼──────┐   ┌──▼────────────┐
                                       │ CommandQueue  │   │TriageDocket │   │ WalkInIntake  │
                                       │- Color Borders│   │- 70/30 Split│   │- Direct Entry │
                                       │- Search/Filter│   │- Protocols  │   │- Bypass ASHA  │
                                       │- Pagination   │   │- Matrix     │   │- Instant Dock │
                                       │- Inpatient Bed│   │- Prescription│  │  Handoff      │
                                       └───────────────┘   │- 3 Verdicts │   └───────────────┘
                                                           └─────────────┘
```

1. **Root Session Gatekeeping**:
   - `App.jsx` inspects `getCurrentSession()` on load. If unauthenticated, it renders `Login.jsx`.
   - `Login.jsx` supports staff PIN authentication (ASHA worker / PHC/CHC Doctor) and patient 12-digit Aadhaar OTP verification.
2. **Doctor Command Workflow & State Isolation**:
   - `DoctorDashboard.jsx` isolates views using `activeView`.
   - Direct walk-in intake (`WalkInIntake.jsx`) posts patient data via `insertTriageRecord`, calls `handleWalkInRegistered`, immediately sets `activeView = 'DOCKET'`, and mounts `TriageDocket.jsx` with the new patient record loaded in View B.
   - When a doctor executes disposition in View B (`handleExecuteVerdict`), executing `ADMIT` allocates a bed in `localFacilityQueue` and returns the console to View A (`setActiveView('QUEUE')`).
3. **Emergency SLA Countdown & Audio Escalation**:
   - `DoctorDashboard.jsx` detects unacknowledged critical cases and computes elapsed seconds against a 180s threshold.
   - At 0s, `audioAlert.js` activates a native browser `AudioContext` sawtooth oscillator siren alternating at 587Hz / 880Hz, and dispatches `escalateTriageRecord(id)` to notify 108 emergency transfer.
4. **Offline-First Resilience**:
   - Both `AshaDashboard.jsx` and `Navbar.jsx` monitor network state via `useNetworkHealth` and `window.addEventListener('online'/'offline')`.
   - When offline, dockets are captured in IndexedDB (`SIH26_OFFLINE_TRIAGE_DB`) with local heuristic triage analysis.
   - On reconnection, `syncOfflineQueue()` iterates through pending dockets, pushes them to Express API, and clears the local queue.
5. **Patient Self-Service Isolation**:
   - `PatientPortal.jsx` passes the citizen's authenticated Aadhaar UID to `/api/patient/my-records`.
   - Formats digital prescription records into Ayushman Bharat-compliant slips, and applies responsive print styles for direct physical printing.

---

## 3. Caveats

1. **`DoctorDashboard.jsx` View C Operator Precedence Condition**:
   - At line 303: `{activeView === 'WALIN' || activeView === 'WALK_IN' && (`
   - While functional because `activeView` defaults to `'QUEUE'` and is set to `'WALK_IN'`, the `'WALIN'` string check is a minor typo. It is recommended to normalize this to `(activeView === 'WALK_IN') && (` during implementation.
2. **Web Speech API Environment Requirements**:
   - Browser Web Speech API (`webkitSpeechRecognition`) requires an active microphone permission grant and requires either `localhost` or HTTPS in production. Fallback manual typing is fully available in all inputs.
3. **Web Audio Autoplay Policies**:
   - Modern browsers restrict audio synthesis before a user gesture. `audioAlert.js` accounts for this by checking `audioCtx.state === 'suspended'` and resuming on user interaction (`getAudioContext()`).
4. **Re-Export Compatibility Layers**:
   - Re-exports exist in `src/components/AshaDashboard.jsx` (`export { default } from '../pages/AshaDashboard'`), `src/components/MedicalTriageDashboard.jsx`, and `src/components/HospitalList.jsx`. These ensure zero broken imports across both legacy and modular component structures.

---

## 4. Conclusion

The frontend codebase satisfies all architectural and functional specifications outlined in **R2 (Clinical Command Center & Modular Portals)** of `ORIGINAL_REQUEST.md`.

### Component Inventory & Status Matrix

| Component | Path | R2 Requirement Alignment | Status |
|:---|:---|:---|:---:|
| **Doctor Command Center** | `src/pages/DoctorDashboard.jsx` | Strict view isolation, SLA countdown monitor, audio alarms, bed management | **Complete (100%)** |
| **Command Queue (View A)** | `src/components/CommandQueue.jsx` | High-density vertical data table, color borders, sticky search, pagination | **Complete (100%)** |
| **Triage Docket (View B)** | `src/components/TriageDocket.jsx` | 70/30 split layout, read-only demographics, vitals matrix, 5 protocol toggles, 3 verdicts | **Complete (100%)** |
| **Walk-In Intake (View C)** | `src/components/WalkInIntake.jsx` | Direct casualty registration form, ASHA bypass, immediate handoff to View B | **Complete (100%)** |
| **Prescription Module** | `src/components/PrescriptionModule.jsx` | 12 essential rural formulary presets, custom drug entry, 10 diagnostic test chips | **Complete (100%)** |
| **ASHA Field Intake** | `src/pages/AshaDashboard.jsx` | High-contrast inputs, voice dictation (hi/en), offline banner, IndexedDB caching | **Complete (100%)** |
| **Patient Portal** | `src/pages/PatientPortal.jsx` | Read-only dossier, Aadhaar isolation, active triage status badge, printable Rx slip | **Complete (100%)** |
| **Design System Tokens** | `src/index.css`, `src/App.css` | Vintage Brutalist styling (`#f5f2eb` vs `#121212`, 2px/4px borders, `rounded-none`, shadows) | **Complete (100%)** |
| **Network & Offline Sync** | `src/services/offlineQueue.js` | IndexedDB `SIH26_OFFLINE_TRIAGE_DB` store, auto-sync upon reconnection | **Complete (100%)** |
| **Audio Escalation Siren** | `src/services/audioAlert.js` | Browser-native Web Audio API synthesizer for 3-minute SLA breach alarm | **Complete (100%)** |

All components are properly exported with zero missing module references.

---

## 5. Verification Method

To independently verify the frontend components and build readiness:

### 5.1 Static Verification Checklist
1. **Zero Missing Exports**:
   - Check `src/App.jsx` imports against `src/pages/` and `src/components/`.
   - Check `src/pages/DoctorDashboard.jsx` imports for `CommandQueue`, `TriageDocket`, `WalkInIntake`, `supabaseService`, `audioAlert`, and `socket`.
   - Check `src/components/TriageDocket.jsx` import for `PrescriptionModule`.
2. **Styling & Layout Verification**:
   - Inspect `frontend/src/index.css` for `@import "tailwindcss";` and `* { border-radius: 0 !important; }`.
   - Inspect `frontend/src/components/TriageDocket.jsx` for `grid grid-cols-1 lg:grid-cols-12` with 8 cols left and 4 cols right.
   - Inspect `frontend/src/components/CommandQueue.jsx` for `border-l-8 border-l-red-600` and `border-l-8 border-l-yellow-400`.

### 5.2 Build & Execution Command
Run the standard Vite production build in `frontend/`:
```powershell
cd c:\Users\PC\Desktop\SIH26\frontend
npm run build
```
*Expected Result*: Output generates in `dist/` with 0 syntax errors, 0 unresolved imports, and clean bundle generation.

### 5.3 Workflow Interactive Verification Points
1. **Doctor Workflow Isolation**:
   - Navigate to `/command`.
   - Click `[ + REGISTER DIRECT WALK-IN PATIENT ]` -> opens View C.
   - Fill in patient casualty details -> click `[ REGISTER WALK-IN & OPEN TRIAGE EVALUATION DOCKET > ]` -> immediately mounts View B with patient preloaded.
   - Click `[ 🟨 ADMIT TO WARD ]` -> verifies bed allocation in `Local Facility Ward` table and returns to View A.
2. **ASHA Offline Mode**:
   - Navigate to `/triage`.
   - Disconnect network / toggle offline in DevTools -> verifies `[OFFLINE MODE: DATA SECURED]` banner renders and submissions buffer to IndexedDB.
3. **Patient Portal**:
   - Authenticate with Aadhaar `5482 9103 8471` (OTP `849201`) -> verifies digital prescription slip renders with Ayushman Bharat badge and `[ PRINT RX SLIP ]` triggers print dialog.
