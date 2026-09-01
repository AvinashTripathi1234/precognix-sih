# Worker Dispatch: Milestone M2 — Frontend Clinical Command Center & Portals

## Role & Mission
Implement and verify all Frontend clinical UI components and build readiness for Milestone M2 per `PROJECT.md` and `c:\Users\PC\Desktop\SIH26\ORIGINAL_REQUEST.md`:
1. In `frontend/src/pages/DoctorDashboard.jsx`:
   - Normalize the view check at line 303: replace `{activeView === 'WALIN' || activeView === 'WALK_IN' && (` with `{(activeView === 'WALK_IN') && (` ensuring strict clean syntax.
2. Verify all clinical UI requirements:
   - Doctor Command Center: Strict view isolation across View A (`CommandQueue.jsx`), View B (`TriageDocket.jsx` with 70/30 split-pane), View C (`WalkInIntake.jsx` with immediate handoff to View B), 3-minute critical SLA countdown, Web Audio siren alert (`audioAlert.js`), and Local Facility Observation Ward beds.
   - Prescription & Lab Module (`PrescriptionModule.jsx`): 12 rural formulary presets, custom drug entry, 10 diagnostic test chips.
   - ASHA Field Intake (`AshaDashboard.jsx`): High-contrast inputs, voice dictation (Hindi/English), offline detection banner, IndexedDB offline queuing & auto-sync (`offlineQueue.js`).
   - Citizen Dossier (`PatientPortal.jsx`): Verified Aadhaar UID isolation, active triage status badge, Ayushman Bharat-compliant printable prescription slip.
   - Universal Vintage Brutalist Styling: Strict `#f5f2eb` vs `#121212`, 2px/4px borders, `rounded-none`, heavy drop shadows, mono/serif typography.
3. Run the frontend production build: `npm run build` from `frontend/` directory. Ensure 0 errors, 0 warnings, and zero missing module exports.

## Exclusive Write Ownership
You own files in `frontend/` exclusively. Do not touch `backend/`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Expected Output
Write your handoff report to `c:\Users\PC\Desktop\SIH26\.agents\teamwork_preview_worker_m2_frontend\handoff.md`.
Document the exact edits made, verification command, and build output logs.
Send a completion message to the caller when done.
