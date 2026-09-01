# E2E Test Infra: Precognix-SIH Emergency Medical Command & Triage

## Test Philosophy
- Opaque-box, requirement-driven verification derived directly from `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial Testing + Real-World Clinical Workload Testing.

---

## Feature Inventory & Test Coverage

| # | Feature | Requirement Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|-------------------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Multi-Role Authentication & Aadhaar OTP | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 2 | Server-Side Patient Pagination | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 3 | Live Queue Search & Filters | ORIGINAL_REQUEST §R1, R2 | 5 tests | 5 tests | ✓ | ✓ |
| 4 | Priority Sorting & Urgency Weighting | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 5 | Casualty Walk-In & Bed Admission | ORIGINAL_REQUEST §R1, R2 | 5 tests | 5 tests | ✓ | ✓ |
| 6 | Dual-Layer Persistence Resilience | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 7 | Real-Time WebSocket Telemetry | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 8 | Immutable Clinical Audit Trail | ORIGINAL_REQUEST §R1 | 5 tests | 5 tests | ✓ | ✓ |
| 9 | Doctor Command Queue (View A) | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 10 | Triage Docket 70/30 Split (View B) | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 11 | Direct Walk-In Intake (View C) | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 12 | Observation Ward Bed Queue | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 13 | 3-Min Critical SLA Audio/Visual Alarm | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 14 | Formulary Presets & Diagnostic Chips | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 15 | ASHA Field Intake & Offline Sync | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 16 | Voice Dictation (hi-IN / en-IN) | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 17 | Citizen Portal Aadhaar Isolation | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 18 | Printable Ayushman Bharat Rx Slip | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |
| 19 | Vintage Brutalist Design System | ORIGINAL_REQUEST §R2 | 5 tests | 5 tests | ✓ | ✓ |

---

## Test Architecture
- **Backend Test Runner**: `node backend/test-verify.js`
  - Spawns in-process HTTP + Socket.io server on port `5099`.
  - Executes 12 comprehensive integration assertions verifying all API routes, dual-layer storage fallback, real-time WebSocket events, audit logs, Aadhaar OTP, and RBAC.
- **Frontend Build Gate**: `npm run build --prefix frontend`
  - Compiles full React 19 / Vite bundle to `frontend/dist/`.
  - Asserts 0 syntax errors, 0 missing module exports, 0 CSS token breakages.

---

## Real-World Application Scenarios (Tier 4)

| # | Scenario | Features Exercised | Complexity | Pass / Fail Criteria |
|---|----------|--------------------|------------|----------------------|
| 1 | Mass Casualty Incident (MCI) Triage Influx | F2, F3, F4, F5, F7, F9, F12 | High | 10 rapid casualty admissions arrive at CHC; Critical cases bubble to top of queue; Bed allocation assigns Beds 01 to 08 without collision. |
| 2 | Remote Village Outpost Intermittent Connectivity | F6, F15, F16 | High | ASHA worker collects intakes during offline drop; zero data loss; records buffer locally in IndexedDB and synchronize upon reconnection. |
| 3 | Critical SLA Countdown Breach & Auto-Escalation | F7, F8, F10, F13 | High | Unacknowledged critical docket reaches 3-min timeout; Web Audio siren triggers; `critical_sla_breach` socket event broadcasts. |
| 4 | Casualty Walk-In -> Bed Admission -> Digital Rx -> Patient Portal | F1, F5, F8, F10, F11, F12, F14, F17, F18 | High | Walk-In registration immediately mounts View B Docket; Doctor admits to Ward Bed with Aspirin & ECG; Citizen logs in via Aadhaar OTP and views/prints Ayushman Bharat Rx slip. |
| 5 | ABDM Digital Prescription Generation & Print Verification | F14, F17, F18, F19 | Medium | Multi-drug prescription with diagnostic test orders formats cleanly for printing under Ayushman Bharat format. |

---

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥ 95 test scenarios)
- Tier 2: ≥5 per feature boundary (Total ≥ 95 boundary checks)
- Tier 3: Pairwise coverage across major feature interactions
- Tier 4: ≥5 realistic clinical application scenarios
- **Acceptance Gates**: `npm run build` in `frontend/` = 0 errors, `node test-verify.js` in `backend/` = 100% pass.
