import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { fetchHealth, fetchStatus, testSupabase } from '../services/api';
import { isSupabaseConfigured } from '../services/supabase';
import { Activity, Send, RefreshCw, Radio, CheckCircle, XCircle, Code, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  // Socket State
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [socketId, setSocketId] = useState(socket.id || 'Connecting...');
  const [latency, setLatency] = useState(null);

  // API State
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    function onWelcome(data) {
      setSocketId(data.socketId);
      setMessages((prev) => [
        ...prev,
        `[Server]: ${data.message} (${new Date(data.timestamp).toLocaleTimeString()})`
      ]);
    }

    function onPong(data) {
      const pingTime = data.clientData?.sentAt;
      if (pingTime) {
        setLatency(Date.now() - pingTime);
      }
      setMessages((prev) => [
        ...prev,
        `[Server Pong]: Latency ${Date.now() - pingTime}ms`
      ]);
    }

    function onBroadcast(data) {
      setMessages((prev) => [
        ...prev,
        `[${data.senderId === socket.id ? 'You' : data.senderId.substring(0, 6)}]: ${data.message}`
      ]);
    }

    socket.on('server:welcome', onWelcome);
    socket.on('server:pong', onPong);
    socket.on('server:broadcast', onBroadcast);

    return () => {
      socket.off('server:welcome', onWelcome);
      socket.off('server:pong', onPong);
      socket.off('server:broadcast', onBroadcast);
    };
  }, []);

  const handleSendPing = () => {
    const sentAt = Date.now();
    socket.emit('client:ping', { sentAt });
    setMessages((prev) => [...prev, `[Client]: Ping sent at ${new Date().toLocaleTimeString()}...`]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    socket.emit('client:message', { message: inputMsg });
    setInputMsg('');
  };

  const handleCallApi = async (type) => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      let res;
      if (type === 'health') res = await fetchHealth();
      else if (type === 'status') res = await fetchStatus();
      else if (type === 'supabase') res = await testSupabase();
      setApiResponse({ type, data: res, success: true });
    } catch (err) {
      setApiResponse({ type, data: { error: err.message }, success: false });
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Interactive Diagnostics & Live Test
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Test real-time WebSocket communication, backend Express REST API routes, and Supabase client integration live.
        </p>
      </div>

      <div className="card-grid">
        {/* Socket.io Live Console Card */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon cyan">
                <Radio size={20} />
              </div>
              <h3 className="card-title">Live Socket.io Real-Time Stream</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSendPing} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                <Activity size={14} /> Send Ping {latency !== null && `(${latency}ms)`}
              </button>
            </div>
          </div>

          <p className="card-desc">
            Socket ID: <code style={{ color: 'var(--accent-cyan)' }}>{socket.id || socketId}</code> | Transport: <code style={{ color: 'var(--accent-emerald)' }}>WebSocket</code>
          </p>

          <div className="chat-box">
            {messages.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 'auto' }}>
                No events yet. Start the backend server and emit a message or ping!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="chat-msg">
                  {msg}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-row">
            <input
              type="text"
              className="input-field"
              placeholder="Type a message to broadcast via Socket.io..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
              <Send size={16} /> Broadcast
            </button>
          </form>
        </div>

        {/* REST API Tester Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon">
                <Code size={20} />
              </div>
              <h3 className="card-title">Backend API Routes</h3>
            </div>
          </div>
          <p className="card-desc">Trigger Express.js backend endpoints directly:</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              onClick={() => handleCallApi('health')}
              disabled={apiLoading}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between' }}
            >
              <span>GET /api/health</span>
              <RefreshCw size={14} className={apiLoading ? 'spin' : ''} />
            </button>

            <button
              onClick={() => handleCallApi('status')}
              disabled={apiLoading}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between' }}
            >
              <span>GET /api/status</span>
              <RefreshCw size={14} className={apiLoading ? 'spin' : ''} />
            </button>

            <button
              onClick={() => handleCallApi('supabase')}
              disabled={apiLoading}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between' }}
            >
              <span>GET /api/supabase-test</span>
              <RefreshCw size={14} className={apiLoading ? 'spin' : ''} />
            </button>
          </div>

          {apiResponse && (
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                border: `1px solid ${apiResponse.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                {apiResponse.success ? (
                  <CheckCircle size={16} color="#10b981" />
                ) : (
                  <XCircle size={16} color="#f43f5e" />
                )}
                Response ({apiResponse.type}):
              </div>
              <pre style={{ overflowX: 'auto', maxHeight: '140px' }}>
                {JSON.stringify(apiResponse.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Environment Variable Check Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon emerald">
                <ShieldCheck size={20} />
              </div>
              <h3 className="card-title">Environment (.env)</h3>
            </div>
          </div>
          <p className="card-desc">Current client-side configuration parameters:</p>

          <div className="kv-list">
            <div className="kv-item">
              <span className="kv-key">VITE_API_URL</span>
              <span className="kv-value">{import.meta.env.VITE_API_URL || 'http://localhost:5000'}</span>
            </div>
            <div className="kv-item">
              <span className="kv-key">VITE_SUPABASE_URL</span>
              <span className="kv-value">
                {import.meta.env.VITE_SUPABASE_URL ? 'Loaded in .env' : 'Missing'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-key">VITE_SUPABASE_ANON_KEY</span>
              <span className="kv-value">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Loaded (Protected)' : 'Missing'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-key">Supabase Status</span>
              <span className="kv-value" style={{ color: isSupabaseConfigured() ? '#10b981' : '#f59e0b' }}>
                {isSupabaseConfigured() ? 'Ready' : 'Placeholder in .env'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
