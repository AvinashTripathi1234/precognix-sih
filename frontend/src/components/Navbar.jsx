import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { socket } from '../services/socket';
import { Layers, Activity, Home, LayoutDashboard, ClipboardPlus } from 'lucide-react';

export default function Navbar() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Layers size={22} color="#6366f1" />
        <span>SIH26 Full-Stack</span>
        <span className="brand-badge">v1.0</span>
      </div>

      <nav className="nav-links">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Home size={16} /> Home
          </span>
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <LayoutDashboard size={16} /> Dashboard & Live Test
          </span>
        </NavLink>
        <NavLink
          to="/referrals"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ClipboardPlus size={16} /> New Referral
          </span>
        </NavLink>
      </nav>

      <div className="nav-status">
        <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
        <span>Socket: {isConnected ? 'Online' : 'Disconnected'}</span>
      </div>
    </header>
  );
}
