import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '50%', color: '#f43f5e', marginBottom: '1.5rem' }}>
        <AlertTriangle size={48} />
      </div>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>404 - Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 2rem auto' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={16} /> Return to Home
      </Link>
    </div>
  );
}
