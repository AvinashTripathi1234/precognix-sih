import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchStatus } from '../services/api';
import { isSupabaseConfigured, getSupabaseConfigInfo } from '../services/supabase';
import { Server, Zap, Database, Globe, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const supabaseInfo = getSupabaseConfigInfo();

  useEffect(() => {
    fetchStatus()
      .then((data) => {
        setBackendStatus(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch backend status:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="hero-section">
      <div className="hero">
        <div className="hero-tag">
          <Zap size={14} /> Full-Stack Architecture Ready
        </div>
        <h1 className="hero-title">
          Express + Socket.io + Supabase + React
        </h1>
        <p className="hero-subtitle">
          A production-ready foundation with modular routing, WebSocket bi-directional communication, Supabase SDK integration, and modern React 19 + Vite.
        </p>
        <div className="hero-actions">
          <Link to="/dashboard" className="btn btn-primary">
            Open Live Dashboard <ArrowRight size={16} />
          </Link>
          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
          >
            Supabase Docs
          </a>
        </div>
      </div>

      <div className="card-grid">
        {/* Backend Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon">
                <Server size={20} />
              </div>
              <h3 className="card-title">Backend API</h3>
            </div>
            <span className="card-badge">Express.js</span>
          </div>
          <p className="card-desc">
            RESTful API server with error-handling middleware, modular routing, and CORS configured.
          </p>
          <div className="kv-list">
            <div className="kv-item">
              <span className="kv-key">Status</span>
              <span className="kv-value" style={{ color: error ? '#f43f5e' : '#10b981' }}>
                {loading ? 'Checking...' : error ? 'Unreachable' : 'Healthy (200 OK)'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-key">Port</span>
              <span className="kv-value">{backendStatus?.port || '5000'}</span>
            </div>
            <div className="kv-item">
              <span className="kv-key">Environment</span>
              <span className="kv-value">{backendStatus?.environment || 'development'}</span>
            </div>
          </div>
        </div>

        {/* Real-time Socket.io Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon cyan">
                <Zap size={20} />
              </div>
              <h3 className="card-title">Real-Time</h3>
            </div>
            <span className="card-badge">Socket.io v4</span>
          </div>
          <p className="card-desc">
            WebSocket server setup for instant push notifications, bi-directional messaging, and rooms.
          </p>
          <div className="kv-list">
            <div className="kv-item">
              <span className="kv-key">Engine</span>
              <span className="kv-value">WebSocket & Polling</span>
            </div>
            <div className="kv-item">
              <span className="kv-key">Heartbeat</span>
              <span className="kv-value">Automated</span>
            </div>
            <div className="kv-item">
              <span className="kv-key">Client Hook</span>
              <span className="kv-value">Pre-wired</span>
            </div>
          </div>
        </div>

        {/* Supabase Database Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon emerald">
                <Database size={20} />
              </div>
              <h3 className="card-title">Supabase SDK</h3>
            </div>
            <span className="card-badge">Postgres / Auth</span>
          </div>
          <p className="card-desc">
            Supabase client initialized across backend and frontend with environment variables.
          </p>
          <div className="kv-list">
            <div className="kv-item">
              <span className="kv-key">Client Init</span>
              <span className="kv-value" style={{ color: supabaseInfo.configured ? '#10b981' : '#f59e0b' }}>
                {supabaseInfo.configured ? 'Configured' : 'Needs Real Keys'}
              </span>
            </div>
            <div className="kv-item">
              <span className="kv-key">Project URL</span>
              <span className="kv-value">{supabaseInfo.url}</span>
            </div>
            <div className="kv-item">
              <span className="kv-key">Env File</span>
              <span className="kv-value">.env / .env.example</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
