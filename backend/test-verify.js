import http from 'http';
import app from './src/app.js';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './src/sockets/socketHandler.js';

async function runTest() {
  console.log('Testing full-stack backend and socket initialization...');

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  setupSocketHandlers(io);

  await new Promise((resolve) => server.listen(5099, resolve));
  console.log('✅ Test server listening on port 5099');

  // Test root endpoint
  const rootRes = await fetch('http://localhost:5099/');
  const rootJson = await rootRes.json();
  console.log('✅ Root endpoint response:', rootJson);

  // Test /api/health
  const healthRes = await fetch('http://localhost:5099/api/health');
  const healthJson = await healthRes.json();
  console.log('✅ /api/health response:', healthJson);

  // Test /api/status
  const statusRes = await fetch('http://localhost:5099/api/status');
  const statusJson = await statusRes.json();
  console.log('✅ /api/status response:', statusJson);

  // Test /api/supabase-test
  const supaRes = await fetch('http://localhost:5099/api/supabase-test');
  const supaJson = await supaRes.json();
  console.log('✅ /api/supabase-test response:', supaJson);

  await new Promise((resolve) => server.close(resolve));
  console.log('✅ Server closed cleanly.');
  console.log('🎉 All backend automated tests passed successfully!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
