# Reviewer Dispatch: Frontend Clinical Portals Review

## Role & Mission
Independently review the frontend implementation in `frontend/` against R2 requirements in `c:\Users\PC\Desktop\SIH26\ORIGINAL_REQUEST.md` and `c:\Users\PC\Desktop\SIH26\PROJECT.md`.
Examine:
1. Doctor Dashboard (`DoctorDashboard.jsx`): Strict component isolation across View A (`CommandQueue.jsx`), View B (`TriageDocket.jsx` 70/30 split), View C (`WalkInIntake.jsx` with instant handoff to View B).
2. 3-Minute Critical SLA countdown, Web Audio API alarm (`audioAlert.js`), and Local Facility Observation Ward bed allocations.
3. Prescription Module (`PrescriptionModule.jsx`): 12 formulary presets, custom drug inputs, and 10 diagnostic lab chips.
4. ASHA Field Intake (`AshaDashboard.jsx`): High-contrast inputs, Web Speech API voice dictation (`hi-IN`/`en-IN`), offline banner, and IndexedDB sync (`offlineQueue.js`).
5. Patient Portal (`PatientPortal.jsx`): Authenticated Aadhaar UID isolation, active triage status badge, and printable Ayushman Bharat prescription slip (`window.print()`).
6. Universal Vintage Brutalist styling (`#f5f2eb` vs `#121212`, 2px/4px borders, `rounded-none`, heavy drop shadows, mono/serif typography).
7. Run the frontend production build: `npm run build` from `frontend/` directory using run_command. Verify 0 errors, 0 missing exports.

## Expected Output
Write your comprehensive review handoff report to `c:\Users\PC\Desktop\SIH26\.agents\teamwork_preview_reviewer_frontend\handoff.md`.
Explicitly state your verdict (`APPROVE` or `REQUEST_CHANGES`) with detailed rationale.
Send a completion message when done.
