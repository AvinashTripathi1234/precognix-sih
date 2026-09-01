import React, { useState, useEffect, useCallback } from 'react';
import { fetchFacilities } from '../services/supabaseService';
import { fetchReferrals, createReferral } from '../services/api';

const TIERS = ['Sub-Centre', 'PHC', 'CHC'];

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).toUpperCase();

const EMPTY_FORM = {
  patient_name: '',
  age: '',
  reason: '',
  from_tier: '',
  to_facility_id: ''
};

function fieldClass(hasError) {
  return `w-full bg-white text-black border-2 p-2.5 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black ${
    hasError ? 'border-[#CC0000] bg-[#FFF0F0] text-[#CC0000]' : 'border-black'
  }`;
}

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
    const { data, error } = await fetchFacilities();
    if (error) {
      setFacilitiesError(error.message || 'Could not load facility directory.');
    } else {
      setFacilities(data || []);
      setFacilitiesError(null);
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
    if (form.age === '') {
      errors.age = 'Age is required.';
    } else if (Number(form.age) < 0 || Number(form.age) > 120) {
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
        age: Number(form.age),
        reason: form.reason.trim(),
        from_tier: form.from_tier,
        to_facility_id: Number(form.to_facility_id)
      });

      setBanner({ type: 'success', message: 'REFERRAL LOGGED SUCCESSFULLY.' });
      setForm(EMPTY_FORM);
      loadReferrals();
    } catch (err) {
      setBanner({ type: 'error', message: err.message.toUpperCase() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-serif text-[#111111]">

      {/* Gazette Section Header */}
      <div className="border-b-4 border-[#111111] pb-3 mb-6">
        <div className="font-mono text-[11px] font-bold uppercase text-[#777777] mb-1">
          REGISTRY GAZETTE • SECTION V
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-black text-[#111111]">
          Inter-Facility Patient Referral Log
        </h2>
        <p className="font-serif italic text-sm text-[#555555] mt-1">
          Record a patient referral from a field facility tier to a receiving hospital, and review the referral ledger below.
        </p>
      </div>

      {/* Referral Entry Form */}
      <div className="border-4 border-[#111111] p-6 md:p-8 bg-[#F9F9F7] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6 mb-8">
        <div className="border-b-2 border-[#111111] pb-4">
          <div className="flex items-center gap-2 font-mono">
            <span className="step-badge">REFERRAL</span>
            <h1 className="text-2xl md:text-3xl font-serif font-black uppercase text-[#111111]">
              New Patient Referral Entry
            </h1>
          </div>
          <p className="font-sans text-xs text-[#555555] mt-1 font-medium">
            Submitting this form logs a referral against the receiving facility and adds the patient to the referral ledger below.
          </p>
        </div>

        {banner && (
          <div
            className={`p-3 border-2 font-mono text-xs font-bold uppercase ${
              banner.type === 'success'
                ? 'bg-[#111111] text-[#F9F9F7] border-[#111111]'
                : 'bg-[#FFF0F0] border-[#CC0000] text-[#CC0000]'
            }`}
          >
            {banner.message}
          </div>
        )}

        {facilitiesError && (
          <div className="p-3 bg-[#FFF0F0] border-2 border-[#CC0000] text-[#CC0000] font-mono text-xs font-bold uppercase">
            COULD NOT LOAD FACILITY DIRECTORY: {facilitiesError.toUpperCase()}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5 font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono text-xs">
            <div className="sm:col-span-5">
              <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] mb-1">
                PATIENT FULL NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={form.patient_name}
                onChange={(e) => updateField('patient_name', e.target.value)}
                className={fieldClass(fieldErrors.patient_name)}
              />
              {fieldErrors.patient_name && (
                <span className="block mt-1 text-[10px] font-bold text-[#CC0000] uppercase">{fieldErrors.patient_name}</span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] mb-1">
                AGE *
              </label>
              <input
                type="number"
                min="0"
                max="120"
                placeholder="54"
                value={form.age}
                onChange={(e) => updateField('age', e.target.value)}
                className={`${fieldClass(fieldErrors.age)} text-center`}
              />
              {fieldErrors.age && (
                <span className="block mt-1 text-[10px] font-bold text-[#CC0000] uppercase">{fieldErrors.age}</span>
              )}
            </div>

            <div className="sm:col-span-5">
              <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] mb-1">
                REASON FOR REFERRAL *
              </label>
              <input
                type="text"
                placeholder="e.g. High BP, Chest pain"
                value={form.reason}
                onChange={(e) => updateField('reason', e.target.value)}
                className={fieldClass(fieldErrors.reason)}
              />
              {fieldErrors.reason && (
                <span className="block mt-1 text-[10px] font-bold text-[#CC0000] uppercase">{fieldErrors.reason}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono text-xs">
            <div className="sm:col-span-4">
              <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] mb-1">
                REFERRING FROM (TIER) *
              </label>
              <select
                value={form.from_tier}
                onChange={(e) => updateField('from_tier', e.target.value)}
                className={fieldClass(fieldErrors.from_tier)}
              >
                <option value="">SELECT TIER...</option>
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>{tier.toUpperCase()}</option>
                ))}
              </select>
              {fieldErrors.from_tier && (
                <span className="block mt-1 text-[10px] font-bold text-[#CC0000] uppercase">{fieldErrors.from_tier}</span>
              )}
            </div>

            <div className="sm:col-span-5">
              <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] mb-1">
                REFERRING TO (DESTINATION FACILITY) *
              </label>
              <select
                value={form.to_facility_id}
                onChange={(e) => updateField('to_facility_id', e.target.value)}
                className={fieldClass(fieldErrors.to_facility_id)}
              >
                <option value="">SELECT DESTINATION FACILITY...</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name} — {f.type}</option>
                ))}
              </select>
              {fieldErrors.to_facility_id && (
                <span className="block mt-1 text-[10px] font-bold text-[#CC0000] uppercase">{fieldErrors.to_facility_id}</span>
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block font-black text-[10px] uppercase tracking-wider text-[#555555] mb-1">
                DATE
              </label>
              <input
                type="text"
                value={TODAY}
                readOnly
                disabled
                className="w-full bg-[#EAEAEA] text-[#777777] border-2 border-black p-2.5 rounded-none font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="border-t-4 border-[#111111] pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 bg-[#111111] text-[#F9F9F7] font-mono font-black text-sm md:text-base uppercase tracking-wider border-2 border-[#111111] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{submitting ? '[ SUBMITTING REFERRAL... ]' : '[ CREATE REFERRAL ENTRY > ]'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Referral Ledger */}
      <section className="border-4 border-[#111111] bg-[#F9F9F7] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <div className="border-b-2 border-[#111111] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="step-badge">LEDGER</span>
            <h2 className="text-xl md:text-2xl font-serif font-black uppercase text-[#111111]">
              Referral Ledger
            </h2>
          </div>
          <button
            type="button"
            onClick={loadReferrals}
            className="py-2 px-3 border-2 border-black uppercase rounded-none cursor-pointer bg-white text-black hover:bg-[#EAE8E2] font-mono text-[11px] font-bold"
          >
            [ {referralsLoading ? 'REFRESHING...' : 'REFRESH'} ]
          </button>
        </div>

        {referralsError && (
          <div className="p-3 bg-[#FFF0F0] border-2 border-[#CC0000] text-[#CC0000] font-mono text-xs font-bold uppercase">
            COULD NOT LOAD REFERRAL LEDGER: {referralsError.toUpperCase()}
          </div>
        )}

        <div className="border-2 border-[#111111] overflow-x-auto bg-white">
          <table className="w-full text-left font-serif text-xs border-collapse">
            <thead>
              <tr className="bg-[#111111] text-white font-mono text-[10px] uppercase border-b-2 border-black">
                <th className="p-3 border-r border-[#444444]">PATIENT</th>
                <th className="p-3 border-r border-[#444444]">REASON</th>
                <th className="p-3 border-r border-[#444444]">ROUTE</th>
                <th className="p-3 border-r border-[#444444] text-center w-32">STATUS</th>
                <th className="p-3 text-right w-40">LOGGED AT</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#CCCCCC] font-mono text-xs">
              {referralsLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center font-bold text-sm">
                    [ SYNCHRONIZING REFERRAL LEDGER... ]
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center font-bold text-sm text-[#777777]">
                    [ NO REFERRALS LOGGED YET. CREATE ONE ABOVE. ]
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 border-r border-[#EEEEEE] font-bold">
                      {r.patients?.name || 'UNKNOWN PATIENT'}
                      {r.patients?.age != null ? ` (${r.patients.age})` : ''}
                    </td>
                    <td className="p-3 border-r border-[#EEEEEE]">{r.reason}</td>
                    <td className="p-3 border-r border-[#EEEEEE]">
                      {r.from_tier || '—'} → {r.facilities?.name || 'UNKNOWN FACILITY'}
                    </td>
                    <td className="p-3 border-r border-[#EEEEEE] text-center">
                      <span className="bg-black text-white px-2 py-0.5 uppercase text-[10px] font-bold">
                        {r.status || 'REFERRED'}
                      </span>
                    </td>
                    <td className="p-3 text-right text-[#555555]">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
