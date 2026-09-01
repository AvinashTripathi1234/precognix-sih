import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { fetchHealth, fetchStatus, testSupabase, analyzeTriage } from '../services/api';
import { isSupabaseConfigured } from '../services/supabase';

export default function Dashboard() {
  // Socket State
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [socketId, setSocketId] = useState(socket.id || 'CONNECTING...');
  const [latency, setLatency] = useState(null);

  // API State
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Triage State
  const [triageSymptoms, setTriageSymptoms] = useState('');
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState(null);
  const [triageError, setTriageError] = useState(null);

  useEffect(() => {
    function onWelcome(data) {
      setSocketId(data.socketId);
      setMessages((prev) => [
        ...prev,
        `[SERVER]: ${data.message} (${new Date(data.timestamp).toLocaleTimeString()})`
      ]);
    }

    function onPong(data) {
      const pingTime = data.clientData?.sentAt;
      if (pingTime) {
        setLatency(Date.now() - pingTime);
      }
      setMessages((prev) => [
        ...prev,
        `[SERVER PONG]: LATENCY ${Date.now() - pingTime}MS`
      ]);
    }

    function onBroadcast(data) {
      setMessages((prev) => [
        ...prev,
        `[${data.senderId === socket.id ? 'LOCAL' : data.senderId.substring(0, 6)}]: ${data.message}`
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
    setMessages((prev) => [...prev, `[CLIENT]: PING TRANSMITTED AT ${new Date().toLocaleTimeString()}...`]);
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

  const handleRunTriage = async (e) => {
    e?.preventDefault();
    if (!triageSymptoms.trim()) return;

    setTriageLoading(true);
    setTriageError(null);
    setTriageResult(null);

    try {
      const data = await analyzeTriage(triageSymptoms);
      setTriageResult(data);
    } catch (err) {
      setTriageError(err.message);
    } finally {
      setTriageLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-serif text-[#111111]">
      <div className="border-b-4 border-[#111111] pb-3 mb-6">
        <div className="font-mono text-[11px] font-bold uppercase text-[#777777] mb-1">
          DIAGNOSTIC TELEMETRY • SECTION V
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-black text-[#111111]">
          System Communication, WebSocket Bus & Endpoint Diagnostics
        </h2>
        <p className="font-serif italic text-sm text-[#555555] mt-1">
          Real-time verification of Express routes, Socket.io bi-directional messaging, and Supabase data connectivity.
        </p>
      </div>

      {/* Collapsed Grid Telemetry Containers */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-2 border-[#111111] bg-[#F9F9F7] divide-y md:divide-y-0 md:divide-x divide-[#111111]">
        
        {/* Left Column: WebSocket Stream */}
        <div className="p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#111111] pb-2 font-mono text-xs">
              <span className="font-bold text-[#111111] uppercase">
                WEBSOCKET DISPATCH BUS // ID: {socket.id || socketId}
              </span>
              <button
                onClick={handleSendPing}
                className="btn-secondary text-[10px] py-1 px-2.5"
              >
                TRANSMIT PING {latency !== null && `[${latency}MS]`}
              </button>
            </div>

            <div className="h-48 bg-[#F9F9F7] border border-[#111111] p-3 overflow-y-auto space-y-1 font-mono text-xs">
              {messages.length === 0 ? (
                <div className="text-[#888888] italic">
                  NO TELEMETRY EVENTS RECORDED YET. TRANSMIT PING OR BROADCAST MESSAGE.
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="border-b border-[#E5E5E5] pb-0.5 text-[#222222]">
                    {msg}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                className="flex-1 font-mono text-xs uppercase"
                placeholder="ENTER BROADCAST PAYLOAD..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
              />
              <button type="submit" className="btn-primary py-2 px-4 text-xs">
                BROADCAST
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: API & Triage Tester */}
        <div className="p-5 space-y-4">
          <div className="font-mono text-xs font-bold uppercase text-[#111111] border-b border-[#111111] pb-2">
            REST API & INFERENCE SMOKE TEST
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleCallApi('health')}
              disabled={apiLoading}
              className="w-full btn-secondary text-xs flex justify-between py-2 text-left"
            >
              <span>GET /api/health</span>
              <span>[EXECUTE]</span>
            </button>

            <button
              onClick={() => handleCallApi('status')}
              disabled={apiLoading}
              className="w-full btn-secondary text-xs flex justify-between py-2 text-left"
            >
              <span>GET /api/status</span>
              <span>[EXECUTE]</span>
            </button>

            <button
              onClick={() => handleCallApi('supabase')}
              disabled={apiLoading}
              className="w-full btn-secondary text-xs flex justify-between py-2 text-left"
            >
              <span>GET /api/supabase-test</span>
              <span>[EXECUTE]</span>
            </button>
          </div>

          {apiResponse && (
            <div className="p-3 border border-[#111111] bg-[#F9F9F7] font-mono text-xs">
              <div className="font-bold uppercase text-[#111111] mb-1">
                RESPONSE ({apiResponse.type}):
              </div>
              <pre className="max-h-24 overflow-x-auto text-[11px] text-[#444444]">
                {JSON.stringify(apiResponse.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Inference Test */}
          <div className="pt-2 border-t border-[#111111]">
            <form onSubmit={handleRunTriage} className="space-y-2">
              <input
                type="text"
                placeholder="TYPE TEST SYMPTOMS TO RUN INFERENCE..."
                value={triageSymptoms}
                onChange={(e) => setTriageSymptoms(e.target.value)}
                className="w-full font-mono text-xs"
              />
              <button
                type="submit"
                disabled={triageLoading || !triageSymptoms.trim()}
                className="btn-primary w-full text-xs py-2"
              >
                {triageLoading ? 'COMPUTING...' : 'TEST GEMINI INFERENCE'}
              </button>
            </form>

            {triageResult && (
              <div className="mt-2 p-2 border border-[#111111] font-mono text-xs bg-[#EFEFEA]">
                <strong>VERDICT:</strong> {triageResult.urgency_score} • {triageResult.suggested_specialist}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
