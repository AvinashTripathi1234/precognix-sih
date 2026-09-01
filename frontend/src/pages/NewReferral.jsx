import React, { useState, useEffect, useCallback } from 'react';
import { fetchFacilities, fetchReferrals, createReferral } from '../services/api';
import { ClipboardPlus, Inbox, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const TIERS = ['Sub-Centre', 'PHC', 'CHC'];

const TODAY = new Date().toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

const EMPTY_FORM = {
  patient_name: '',
  age: '',
  reason: '',
  from_tier: '',
  to_facility_id: ''
};

export default function NewReferral() {
  const [facilities, setFacilities] = useState([]);
  const [facilitiesError, setFacilitiesError] = useState(null);

  const [referrals, setReferrals] = useState([]);
  const [referralsLoading, setReferralsLoading] = useState(true);
  const [referralsError, setReferralsError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message }

  const loadFacilities = useCallback(async () => {
    try {
      const res = await fetchFacilities();
      setFacilities(res.facilities || []);
      setFacilitiesError(null);
    } catch (err) {
      setFacilitiesError(err.message);
    }
  }, []);

  const loadReferrals = useCallback(async () => {
    setReferralsLoading(true);
    try {
      const res = await fetchReferrals();
      setReferrals(res.referrals || []);
      setReferralsError(null);
    } catch (err) {
      setReferralsError(err.message);
    } finally {
      setReferralsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacilities();
    loadReferrals();
  }, [loadFacilities, loadReferrals]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errors = {};
    if (!form.patient_name.trim()) errors.patient_name = 'Patient name is required.';
    if (!form.reason.trim()) errors.reason = 'Reason for referral is required.';
    if (!form.from_tier) errors.from_tier = 'Select where the patient is being referred from.';
    if (!form.to_facility_id) errors.to_facility_id = 'Select a destination facility.';
    if (form.age !== '' && (Number(form.age) < 0 || Number(form.age) > 120)) {
      errors.age = 'Age must be between 0 and 120.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await createReferral({
        patient_name: form.patient_name.trim(),
        age: form.age === '' ? null : Number(form.age),
        reason: form.reason.trim(),
        from_tier: form.from_tier,
        to_facility_id: Number(form.to_facility_id)
      });

      setBanner({ type: 'success', message: 'Referral created successfully.' });
      setForm(EMPTY_FORM);
      loadReferrals();
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          New Referral
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Record a patient referral between facilities and see recent referrals below.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon">
              <ClipboardPlus size={20} />
            </div>
            <h3 className="card-title">Referral Details</h3>
          </div>
        </div>

        {banner && (
          <div
            className="form-banner"
            style={{
              borderColor: banner.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'
            }}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 size={16} color="#10b981" />
            ) : (
              <AlertCircle size={16} color="#f43f5e" />
            )}
            <span>{banner.message}</span>
          </div>
        )}

        {facilitiesError && (
          <div className="form-banner" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            <AlertCircle size={16} color="#f43f5e" />
            <span>Could not load facilities: {facilitiesError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="patient_name">Patient Name</label>
              <input
                id="patient_name"
                type="text"
                className="input-field"
                value={form.patient_name}
                onChange={(e) => updateField('patient_name', e.target.value)}
                placeholder="e.g. Ramesh Kumar"
              />
              {fieldErrors.patient_name && <span className="form-error">{fieldErrors.patient_name}</span>}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="age">Age (optional)</label>
              <input
                id="age"
                type="number"
                min="0"
                max="120"
                className="input-field"
                value={form.age}
                onChange={(e) => updateField('age', e.target.value)}
                placeholder="e.g. 54"
              />
              {fieldErrors.age && <span className="form-error">{fieldErrors.age}</span>}
            </div>

            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" htmlFor="reason">Reason for Referral</label>
              <input
                id="reason"
                type="text"
                className="input-field"
                value={form.reason}
                onChange={(e) => updateField('reason', e.target.value)}
                placeholder="e.g. High BP, Chest pain"
              />
              {fieldErrors.reason && <span className="form-error">{fieldErrors.reason}</span>}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="from_tier">Referring From</label>
              <select
                id="from_tier"
                className="input-field"
                value={form.from_tier}
                onChange={(e) => updateField('from_tier', e.target.value)}
              >
                <option value="">Select facility tier...</option>
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
              {fieldErrors.from_tier && <span className="form-error">{fieldErrors.from_tier}</span>}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="to_facility_id">Referring To</label>
              <select
                id="to_facility_id"
                className="input-field"
                value={form.to_facility_id}
                onChange={(e) => updateField('to_facility_id', e.target.value)}
              >
                <option value="">Select destination facility...</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} — {f.type}</option>
                ))}
              </select>
              {fieldErrors.to_facility_id && <span className="form-error">{fieldErrors.to_facility_id}</span>}
            </div>

            <div className="form-field">
              <label className="form-label">Date</label>
              <input type="text" className="input-field" value={TODAY} readOnly disabled />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '1.25rem' }}>
            <RefreshCw size={16} className={submitting ? 'spin' : ''} />
            {submitting ? 'Submitting...' : 'Create Referral'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-icon cyan">
              <Inbox size={20} />
            </div>
            <h3 className="card-title">Recent Referrals</h3>
          </div>
          <button
            onClick={loadReferrals}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={referralsLoading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {referralsError && (
          <div className="form-banner" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            <AlertCircle size={16} color="#f43f5e" />
            <span>Could not load referrals: {referralsError}</span>
          </div>
        )}

        {!referralsError && referrals.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1.5rem 0', textAlign: 'center' }}>
            {referralsLoading ? 'Loading...' : 'No referrals yet. Create one above.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {referrals.map((r) => (
            <div key={r.id} className="referral-row">
              <div className="referral-main">
                <span className="referral-patient">
                  {r.patients?.name || 'Unknown patient'}
                  {r.patients?.age != null ? ` (${r.patients.age})` : ''}
                </span>
                <span className="referral-meta">{r.reason}</span>
              </div>
              <div className="referral-main">
                <span className="referral-meta">
                  {r.from_tier || '—'} → {r.facilities?.name || 'Unknown facility'}
                </span>
                <span className="tier-badge">{r.status || 'pending'}</span>
              </div>
              <div className="referral-date">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
