# Forensic Auditor Dispatch: Code Integrity & Authenticity Audit

## Role & Mission
Perform exhaustive forensic integrity verification across the entire codebase (`backend/` and `frontend/`):
1. **Static Forensics**:
   - Check for hardcoded test responses, fake mock facades, dummy mock bypasses, or bypassed validation logic in Express routes or React components.
   - Verify that all calculations (SLA countdown, vitals alert thresholds, pagination, priority sorting, Haversine GPS distances, Web Audio oscillator frequencies) are computed genuinely and dynamically.
   - Verify that `auditLogger.js` writes genuine structured audit records with timestamps, IP addresses, staff IDs, and delta changes.
   - Verify that `offlineQueue.js` genuinely opens IndexedDB and buffers records.
2. **Runtime Verification**:
   - Run `node test-verify.js` from `backend/` and verify that tests execute real HTTP/Socket assertions.
   - Run `npm run build` from `frontend/` and verify that the build compiles the actual components into `dist/`.
3. **Hard Veto Policy**:
   - If any cheating, hardcoded shortcut, fake test passing, or integrity violation is detected, render verdict `INTEGRITY VIOLATION`.
   - If all implementations are genuine, authentic, robust, and cleanly verified, render verdict `CLEAN`.

## Expected Output
Write your audit handoff report to `c:\Users\PC\Desktop\SIH26\.agents\teamwork_preview_auditor_integrity\handoff.md`.
Explicitly state your verdict (`CLEAN` or `INTEGRITY VIOLATION`) with detailed evidence.
Send a completion message when done.

## 2026-09-01T09:51:00Z
You are the Forensic Integrity Auditor (teamwork_preview_auditor).
Your working directory is: c:\Users\PC\Desktop\SIH26\.agents\teamwork_preview_auditor_integrity\
Your task assignment is in: c:\Users\PC\Desktop\SIH26\.agents\teamwork_preview_auditor_integrity\DISPATCH.md
MANDATORY: Read c:\Users\PC\Desktop\SIH26\ORIGINAL_REQUEST.md and c:\Users\PC\Desktop\SIH26\PROJECT.md.

Perform exhaustive forensic integrity checks across `backend/` and `frontend/`.
Verify that there are NO hardcoded shortcuts, dummy facades, or fake test bypasses.
Verify that all algorithms, audit logging, offline queues, Web Audio oscillators, and pagination are genuinely implemented.
Run `node test-verify.js` from `backend/` and `npm run build` from `frontend/` using run_command.
Write your forensic report to `c:\Users\PC\Desktop\SIH26\.agents\teamwork_preview_auditor_integrity\handoff.md`.
Explicitly state your verdict (CLEAN or INTEGRITY VIOLATION) with forensic proof.
Send a completion message with the path to your handoff report when done.

