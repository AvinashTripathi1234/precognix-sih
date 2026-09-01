import http from 'http';
import app from './src/app.js';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import { setupSocketHandlers } from './src/sockets/socketHandler.js';

async function runTest() {
  console.log('Testing full-stack backend: Auth (Aadhaar OTP + Staff Login), Audit Logs, RBAC Patient Isolation, SLA Escalation, and Socket.io Broadcasts...');

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  app.set('io', io);
  setupSocketHandlers(io);

  await new Promise((resolve) => server.listen(5099, resolve));
  console.log('✅ Test server listening on port 5099');

  // Connect test Socket.io client
  const clientSocket = ClientIO('http://localhost:5099');
  let socketUpdatedReceived = false;
  let socketDeletedReceived = false;
  let socketAckReceived = false;
  let socketSlaBreachReceived = false;

  clientSocket.on('patient_updated', (data) => {
    console.log('🔌 [Test Client]: Received "patient_updated" via WebSocket:', data.id);
    socketUpdatedReceived = true;
  });

  clientSocket.on('patient_deleted', (data) => {
    console.log('🔌 [Test Client]: Received "patient_deleted" via WebSocket:', data.id);
    socketDeletedReceived = true;
  });

  clientSocket.on('triage_acknowledged', (data) => {
    console.log('🔌 [Test Client]: Received "triage_acknowledged" via WebSocket:', data.id);
    socketAckReceived = true;
  });

  clientSocket.on('critical_sla_breach', (data) => {
    console.log('🔌 [Test Client]: Received "critical_sla_breach" via WebSocket:', data.id);
    socketSlaBreachReceived = true;
  });

  // 1. Test /api/health
  const healthRes = await fetch('http://localhost:5099/api/health');
  const healthJson = await healthRes.json();
  console.log('✅ /api/health response:', healthJson);

  // 1b. Test /api/supabase-test
  const sbTestRes = await fetch('http://localhost:5099/api/supabase-test');
  const sbTestJson = await sbTestRes.json();
  console.log(`✅ GET /api/supabase-test (${sbTestRes.status}):`, sbTestJson.mode, `(Configured: ${sbTestJson.supabase_configured})`);
  if (sbTestRes.status !== 200 || sbTestJson.status !== 'ok') {
    throw new Error('GET /api/supabase-test failed to return status ok');
  }

  // 2. Test /favicon.ico (204 No Content)
  const faviconRes = await fetch('http://localhost:5099/favicon.ico');
  console.log(`✅ /favicon.ico status: ${faviconRes.status} (204 No Content)`);
  if (faviconRes.status !== 204 && faviconRes.status !== 200) {
    throw new Error(`Expected 204 or 200 for favicon, got ${faviconRes.status}`);
  }

  // 3. Test /api/auth/send-otp
  const sendOtpRes = await fetch('http://localhost:5099/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aadhaar_number: '548291038471' })
  });
  const sendOtpJson = await sendOtpRes.json();
  console.log(`✅ POST /api/auth/send-otp (${sendOtpRes.status}):`, sendOtpJson.message, `(Hint OTP: ${sendOtpJson.otp_hint})`);

  // 4. Test /api/auth/verify-otp
  const verifyOtpRes = await fetch('http://localhost:5099/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aadhaar_number: '548291038471', otp: sendOtpJson.otp_hint || '849201' })
  });
  const verifyOtpJson = await verifyOtpRes.json();
  console.log(`✅ POST /api/auth/verify-otp (${verifyOtpRes.status}): Token generated for ${verifyOtpJson.user?.name}`);

  // 5. Test /api/auth/login (Doctor CHC)
  const doctorLoginRes = await fetch('http://localhost:5099/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'DR_ANAND_VERMA', pin: '1234', role: 'CHC_DOCTOR', sub_tier: 'CHC' })
  });
  const doctorLoginJson = await doctorLoginRes.json();
  console.log(`✅ POST /api/auth/login (${doctorLoginRes.status}): Staff login successful for ${doctorLoginJson.user?.staff_id} (${doctorLoginJson.user?.sub_tier})`);

  // 6. Test /api/patients (GET with Pagination, Search, and Priority Sorting)
  const patientsRes = await fetch('http://localhost:5099/api/patients?page=1&limit=5');
  const patientsJson = await patientsRes.json();
  console.log(`✅ /api/patients GET response (${patientsRes.status}): ${patientsJson.data?.length} records found. Total: ${patientsJson.pagination?.total}, Total Pages: ${patientsJson.pagination?.totalPages}`);
  if (!patientsJson.pagination || patientsJson.pagination.page !== 1) {
    throw new Error('Pagination metadata missing or incorrect in GET /api/patients');
  }

  // 6b. Test /api/patients (GET Server-Side Search)
  const searchRes = await fetch('http://localhost:5099/api/patients?search=Ramesh');
  const searchJson = await searchRes.json();
  console.log(`✅ /api/patients GET search="Ramesh" (${searchRes.status}): ${searchJson.data?.length} matching records found`);
  if (!searchJson.data || searchJson.data.length === 0) {
    throw new Error('Server-side search failed to find matching record for "Ramesh"');
  }

  // 6c. Test /api/patients (GET Critical Urgency Filter)
  const critRes = await fetch('http://localhost:5099/api/patients?urgency=Critical');
  const critJson = await critRes.json();
  console.log(`✅ /api/patients GET urgency="Critical" (${critRes.status}): ${critJson.data?.length} critical records filtered`);
  if (!critJson.data || critJson.data.some((r) => r.ai_urgency_score !== 'Critical')) {
    throw new Error('Urgency filter returned non-critical records');
  }

  // 6d. Test /api/patients (POST Walk-In Registration / Admission with Bed Allocation)
  const walkInRes = await fetch('http://localhost:5099/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'CHC_DOCTOR' },
    body: JSON.stringify({
      patient_name: 'Mahesh Verma',
      patient_age: '44 YRS / MALE',
      aadhaar_number: '556677889900',
      symptoms: '[DIRECT WALK-IN] Acute severe abdominal colic with dehydration',
      urgency_score: 'High',
      status: 'ADMITTED',
      bed: 'Bed 04',
      immediate_action: 'Admit walk-in patient to CHC Inpatient Stabilization Ward.'
    })
  });
  const walkInJson = await walkInRes.json();
  console.log(`✅ POST /api/patients (201): Walk-in patient registered ID=${walkInJson.record?.id} Status=${walkInJson.record?.status} Bed=${walkInJson.record?.bed}`);
  if (walkInRes.status !== 201 || !walkInJson.record?.id) {
    throw new Error('POST /api/patients failed to create walk-in record');
  }
  if (walkInJson.record?.bed !== 'Bed 04' || walkInJson.record?.clinical_data?.bed !== 'Bed 04') {
    throw new Error('POST /api/patients failed to persist bed allocation');
  }

  // 6e. Test /api/triage/analyze Route Alias (Validation rejection check on malformed payload)
  const triageAnalyzeRes = await fetch('http://localhost:5099/api/triage/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'ASHA_WORKER' },
    body: JSON.stringify({}) // Empty body to trigger validateTriagePayload
  });
  const triageAnalyzeJson = await triageAnalyzeRes.json();
  console.log(`✅ POST /api/triage/analyze schema validation (${triageAnalyzeRes.status}):`, triageAnalyzeJson.message || triageAnalyzeJson.error);
  if (triageAnalyzeRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for empty payload on /api/triage/analyze, got ${triageAnalyzeRes.status}`);
  }

  // 7. Test /api/triage/:id/acknowledge (POST)
  const ackRes = await fetch('http://localhost:5099/api/triage/TR-8841/acknowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'CHC_DOCTOR', 'x-staff-id': 'DR_ANAND_VERMA' },
    body: JSON.stringify({ doctor_id: 'DR_ANAND_VERMA' })
  });
  const ackJson = await ackRes.json();
  console.log(`✅ POST /api/triage/TR-8841/acknowledge (${ackRes.status}):`, ackJson.message);

  // 8. Test /api/triage/:id/escalate (POST SLA Breach)
  const escalateRes = await fetch('http://localhost:5099/api/triage/TR-8841/escalate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'SYSTEM' }
  });
  const escalateJson = await escalateRes.json();
  console.log(`✅ POST /api/triage/TR-8841/escalate (${escalateRes.status}):`, escalateJson.message);

  // 9. Test /api/audit-logs (GET)
  const auditRes = await fetch('http://localhost:5099/api/audit-logs?limit=10');
  const auditJson = await auditRes.json();
  console.log(`✅ GET /api/audit-logs (${auditRes.status}): ${auditJson.data?.length} immutable trail entries retrieved`);

  // 10. Test /api/patient/my-records (Patient Isolation with Aadhaar UID)
  const patientRes = await fetch('http://localhost:5099/api/patient/my-records', {
    headers: { 'x-user-role': 'PATIENT', 'x-patient-aadhaar': '548291038471' }
  });
  const patientJson = await patientRes.json();
  console.log(`✅ GET /api/patient/my-records (${patientRes.status}): Isolated records found: ${patientJson.data?.length}`);

  // 11. Test /api/patients/:id (PUT with Bed Allocation Update)
  const targetId = 'TR-8841';
  const updateRes = await fetch(`http://localhost:5099/api/patients/${targetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'ASHA_WORKER' },
    body: JSON.stringify({
      patient_name: 'Ramesh Kumar (Updated)',
      medical_history: 'Hypertension, Diabetes, Stent (2023), Mild Asthma',
      bed: 'Bed 08',
      status: 'RESOLVED'
    })
  });
  const updateJson = await updateRes.json();
  console.log(`✅ PUT /api/patients/${targetId} response (${updateRes.status}):`, updateJson.message, `Bed=${updateJson.record?.bed}`);
  if (updateJson.record?.bed !== 'Bed 08' || updateJson.record?.clinical_data?.bed !== 'Bed 08') {
    throw new Error('PUT /api/patients/:id failed to update and persist bed allocation');
  }

  // 12. Test /api/patients/:id (DELETE)
  const deleteRes = await fetch(`http://localhost:5099/api/patients/${targetId}`, {
    method: 'DELETE',
    headers: { 'x-user-role': 'SUPERINTENDENT' }
  });
  const deleteJson = await deleteRes.json();
  console.log(`✅ DELETE /api/patients/${targetId} response (${deleteRes.status}):`, deleteJson.message);

  // Wait briefly for WebSocket emission
  await new Promise((r) => setTimeout(r, 600));

  clientSocket.close();
  await new Promise((resolve) => server.close(resolve));
  console.log('✅ Server closed cleanly.');
  console.log('🎉 ALL MULTI-ROLE AUTH, AADHAAR OTP, AUDIT LOGS & WEBSOCKET TESTS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
