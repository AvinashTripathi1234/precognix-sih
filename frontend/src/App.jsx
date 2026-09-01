import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import BackendConnectionStatus from './components/BackendConnectionStatus';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AshaDashboard from './pages/AshaDashboard';
import MedicalTriageDashboard from './pages/MedicalTriageDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import FacilitiesPage from './pages/FacilitiesPage';
import Login from './pages/Login';
import PatientPortal from './pages/PatientPortal';
import NotFound from './pages/NotFound';
import { getCurrentSession } from './services/authService';
import './App.css';

export default function App() {
  // Top-level authenticated session state initialized from localStorage
  const [authSession, setAuthSession] = useState(() => {
    const { user } = getCurrentSession();
    return user || null;
  });

  // Sync state with global auth events (login/logout)
  useEffect(() => {
    const handleAuthChange = (e) => {
      const user = e.detail?.user || null;
      setAuthSession(user);
    };

    window.addEventListener('sih26_auth_changed', handleAuthChange);
    return () => {
      window.removeEventListener('sih26_auth_changed', handleAuthChange);
    };
  }, []);

  // ============================================================================
  // STRICT ROOT-LEVEL GATEKEEPER:
  // If no active authSession exists, block all routes & render ONLY fullscreen Login
  // ============================================================================
  if (!authSession) {
    return (
      <div className="w-full min-h-screen bg-[#f5f2eb] dark:bg-[#121212]">
        <Login onLoginSuccess={(user) => setAuthSession(user)} />
      </div>
    );
  }

  // Determine role-specific primary workspace
  const isAsha = authSession.role === 'ASHA_WORKER' || authSession.role === 'ASHA';
  const isDoctor =
    authSession.role === 'CHC_DOCTOR' ||
    authSession.role === 'DOCTOR' ||
    authSession.role === 'PHC_DOCTOR' ||
    authSession.role === 'SUPERINTENDENT';
  const isPatient = authSession.role === 'PATIENT';

  return (
    <div className="app-container">
      {/* Network Resilience Status Banner */}
      <BackendConnectionStatus />

      {/* Broadsheet Masthead & Navigation */}
      <Navbar authUser={authSession} />

      {/* Authenticated Application Workspace */}
      <main className="main-content">
        <Routes>
          {/* Dynamic Root Route: Immediate Role-Based Landing */}
          <Route
            path="/"
            element={
              isPatient ? (
                <PatientPortal />
              ) : isAsha ? (
                <AshaDashboard />
              ) : isDoctor ? (
                <DoctorDashboard />
              ) : (
                <Home />
              )
            }
          />

          {/* Core Healthcare Modules */}
          <Route path="/command" element={<DoctorDashboard />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/medical-triage" element={<DoctorDashboard />} />
          <Route path="/triage" element={<AshaDashboard />} />
          <Route path="/asha" element={<AshaDashboard />} />
          <Route path="/facilities" element={<FacilitiesPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patient-portal" element={<PatientPortal />} />
          <Route path="/patient" element={<PatientPortal />} />
          
          {/* Fallback & Auth redirects */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
