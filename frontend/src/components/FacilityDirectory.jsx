import React, { useState, useEffect } from 'react';
import { fetchFacilities } from '../services/supabaseService';
import { getUserLocation, calculateDistanceKm, estimateTransferMinutes, DEFAULT_RURAL_COORDS } from '../services/geoService';

// Medical Condition Keyword to Clinical Capability Thesaurus Index
const CONDITION_INDEX_MAP = {
  diabetes: ['Endocrinology', 'General Medicine', 'Internal Medicine', 'Diabetic Care', 'Pathology'],
  diabetic: ['Endocrinology', 'General Medicine', 'Internal Medicine', 'Diabetic Care', 'Pathology'],
  sugar: ['Endocrinology', 'General Medicine', 'Diabetic Care'],
  hypertension: ['Cardiology', 'General Medicine', 'Internal Medicine', 'ICU', 'Emergency Medicine'],
  bp: ['Cardiology', 'General Medicine', 'Internal Medicine', 'ICU'],
  cardiac: ['Cardiology', 'ICU', 'Emergency Medicine', 'Critical Care', 'Cardiac Care'],
  heart: ['Cardiology', 'ICU', 'Emergency Medicine', 'Cardiac Care'],
  chest: ['Cardiology', 'Pulmonology', 'Emergency Medicine', 'ICU'],
  asthma: ['Pulmonology', 'Respiratory Medicine', 'Emergency Medicine', 'Pediatrics'],
  copd: ['Pulmonology', 'Respiratory Medicine', 'Critical Care'],
  tb: ['Pulmonology', 'Tuberculosis Care', 'DOTS Centre', 'General Medicine', 'Respiratory Medicine'],
  tuberculosis: ['Pulmonology', 'Tuberculosis Care', 'DOTS Centre', 'General Medicine'],
  respiratory: ['Pulmonology', 'Respiratory Medicine', 'Critical Care', 'ICU'],
  surgery: ['General Surgery', 'OT', 'Orthopedics', 'Trauma Care'],
  surgical: ['General Surgery', 'OT', 'Orthopedics', 'Trauma Care'],
  trauma: ['Trauma Care', 'Emergency Medicine', 'Orthopedics', 'General Surgery'],
  snakebite: ['Emergency Medicine', 'Toxicology', 'Critical Care', 'General Medicine', 'ICU'],
  venom: ['Emergency Medicine', 'Toxicology', 'Critical Care'],
  bite: ['Emergency Medicine', 'Toxicology', 'General Medicine'],
  pregnancy: ['Obstetrics & Gynecology', 'Maternity Care', 'Labor Room', 'NICU'],
  maternity: ['Obstetrics & Gynecology', 'Maternity Care', 'Labor Room'],
  obstetric: ['Obstetrics & Gynecology', 'Maternity Care'],
  pediatric: ['Pediatrics', 'NICU', 'PICU', 'Child Health'],
  child: ['Pediatrics', 'NICU', 'PICU', 'Child Health'],
  kidney: ['Nephrology', 'Dialysis Unit', 'Urology', 'General Medicine'],
  renal: ['Nephrology', 'Dialysis Unit', 'General Medicine'],
  dialysis: ['Dialysis Unit', 'Nephrology']
};

const CLINICAL_CONDITION_FILTERS = [
  { label: 'ALL FACILITIES', query: '' },
  { label: 'CARDIAC & HYPERTENSION', query: 'cardiac' },
  { label: 'DIABETES & METABOLIC', query: 'diabetes' },
  { label: 'RESPIRATORY & TB', query: 'respiratory' },
  { label: 'SURGICAL & TRAUMA', query: 'surgery' },
  { label: 'MATERNITY & OBSTETRICS', query: 'maternity' },
  { label: 'PEDIATRICS & NICU', query: 'pediatric' },
  { label: 'DIALYSIS & RENAL', query: 'dialysis' }
];

export default function FacilityDirectory({
  onSelectFacility,
  onConfirmDispatch,
  selectedFacilityId,
  patientContext = null,
  serviceFilter = '',
  compact = false
}) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Geospatial State
  const [userLocation, setUserLocation] = useState(DEFAULT_RURAL_COORDS);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Clinical Search & Condition Index State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeConditionFilter, setActiveConditionFilter] = useState('');
  const [activeServiceTag, setActiveServiceTag] = useState(serviceFilter);

  // Modal / Drawer state for referral dispatch confirmation
  const [confirmingFacility, setConfirmingFacility] = useState(null);
  const [dispatchedFacility, setDispatchedFacility] = useState(null);
  const [dispatchTimestamp, setDispatchTimestamp] = useState(null);

  useEffect(() => {
    loadFacilities();
    initLocation();
  }, []);

  const initLocation = async () => {
    setGpsLoading(true);
    try {
      const loc = await getUserLocation();
      setUserLocation(loc);
    } finally {
      setGpsLoading(false);
    }
  };

  const loadFacilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await fetchFacilities();
      if (fetchErr) throw fetchErr;
      setFacilities(data || []);
    } catch (err) {
      console.error('Failed to load facilities:', err);
      setError(err.message || 'Failed to load facilities directory');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (facility) => {
    if (onSelectFacility) {
      onSelectFacility(facility);
    }
    setConfirmingFacility(facility);
  };

  const handleFinalDispatch = () => {
    if (!confirmingFacility) return;

    if (onConfirmDispatch) {
      onConfirmDispatch(confirmingFacility);
    } else if (onSelectFacility) {
      onSelectFacility(confirmingFacility);
    }

    setDispatchedFacility(confirmingFacility);
    setDispatchTimestamp(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    setConfirmingFacility(null);
  };

  // Extract all distinct service tags
  const allServiceTags = Array.from(
    new Set(facilities.flatMap((f) => f.available_services || []))
  );

  // Clinical Condition Matching Engine
  const matchesConditionIndex = (facility, term) => {
    if (!term.trim()) return true;
    const cleanQuery = term.toLowerCase().trim();
    const queryWords = cleanQuery.split(/[\s,]+/);

    const directNameMatch = facility.name.toLowerCase().includes(cleanQuery);
    const directTypeMatch = facility.type && facility.type.toLowerCase().includes(cleanQuery);
    if (directNameMatch || directTypeMatch) return true;

    const services = (facility.available_services || []).map((s) => s.toLowerCase());
    const directServiceMatch = services.some((s) => s.includes(cleanQuery));
    if (directServiceMatch) return true;

    for (const word of queryWords) {
      const mappedCapabilities = CONDITION_INDEX_MAP[word];
      if (mappedCapabilities) {
        const matchesMapped = mappedCapabilities.some((cap) =>
          services.some((svc) => svc.toLowerCase().includes(cap.toLowerCase()))
        );
        if (matchesMapped) return true;
      }
    }

    return false;
  };

  const facilitiesWithGeo = facilities.map((fac) => {
    const dist = calculateDistanceKm(
      userLocation.latitude,
      userLocation.longitude,
      fac.location_lat,
      fac.location_lng
    );
    const eta = estimateTransferMinutes(dist);
    return { ...fac, distanceKm: dist, etaMinutes: eta };
  });

  const filteredFacilities = facilitiesWithGeo
    .filter((facility) => {
      const matchesSearch = matchesConditionIndex(facility, searchTerm);
      const matchesConditionPreset = activeConditionFilter
        ? matchesConditionIndex(facility, activeConditionFilter)
        : true;
      const matchesServiceTag =
        !activeServiceTag ||
        facility.available_services?.some(
          (s) => s.toLowerCase() === activeServiceTag.toLowerCase()
        );

      return matchesSearch && matchesConditionPreset && matchesServiceTag;
    })
    .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

  return (
    <div className="space-y-4 font-serif text-[#111111]">
      {/* Dispatched Notification Banner */}
      {dispatchedFacility && (
        <div className="border-2 border-[#111111] bg-[#EAE8E2] p-4 text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-[#111111] text-white px-2 py-0.5 font-bold uppercase text-[10px]">
              DISPATCH CONFIRMED
            </span>
            <span className="font-bold text-[#111111]">
              PATIENT CASE LINKED TO {dispatchedFacility.name.toUpperCase()} (FAC-0{dispatchedFacility.id})
            </span>
          </div>
          <span className="text-[#555555]">
            TRANSMITTED AT {dispatchTimestamp}
          </span>
        </div>
      )}

      {/* Header & Clinical Search Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#111111] pb-4">
        <div>
          <h3 className="font-serif font-bold text-lg text-[#111111]">
            Regional Healthcare Centers & Clinical Capability Index
          </h3>
          <div className="flex items-center gap-2 font-mono text-xs text-[#666666] uppercase mt-0.5">
            <span>{filteredFacilities.length} OF {facilities.length} FACILITIES MATCHING CRITERIA</span>
            <span>•</span>
            <span className="text-[#111111] font-bold">
              GPS ANCHOR: {userLocation.villageName} ({userLocation.latitude.toFixed(4)}°N, {userLocation.longitude.toFixed(4)}°E)
            </span>
          </div>
        </div>

        {/* Enhanced Clinical Search Input */}
        <div className="w-full lg:w-96 space-y-1">
          <div className="flex items-center border-b-2 border-[#111111] bg-[#F9F9F7] px-2 py-1">
            <span className="font-mono text-xs font-bold text-[#777777] mr-2">SEARCH:</span>
            <input
              type="text"
              placeholder="E.G. DIABETES, CARDIAC, HYPERTENSION, TB, SURGERY..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full font-mono text-xs uppercase bg-transparent border-none focus:outline-none placeholder:text-[#999999]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="font-mono text-xs text-[#777777] hover:text-[#111111] px-1 cursor-pointer font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <div className="font-mono text-[10px] text-[#777777] uppercase flex justify-between">
            <span>INDEXES NAME, TIER & JSONB SERVICES</span>
            <span>HAVERSINE DISTANCE RANKED</span>
          </div>
        </div>
      </div>

      {/* Preset Condition Quick Filter Chips */}
      <div className="space-y-1.5 pt-1">
        <div className="font-mono text-[10px] font-bold uppercase text-[#555555]">
          CHRONIC CONDITION & CLINICAL SPECIALTY PRESETS:
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
          {CLINICAL_CONDITION_FILTERS.map((f) => {
            const isActive = activeConditionFilter === f.query;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  setActiveConditionFilter(isActive ? '' : f.query);
                  if (!isActive) setSearchTerm(f.query);
                }}
                className={`px-2.5 py-1 border transition-none font-bold uppercase cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-[#F9F9F7] border-[#111111]'
                    : 'bg-[#F9F9F7] text-[#111111] border-[#111111] hover:bg-[#EAE8E2]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Service Tags Filter Strip */}
      {allServiceTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] pt-1">
          <span className="text-[#777777] uppercase font-bold mr-1">SERVICES:</span>
          {activeServiceTag && (
            <button
              type="button"
              onClick={() => setActiveServiceTag('')}
              className="bg-[#111111] text-white px-2 py-0.5 uppercase cursor-pointer"
            >
              CLEAR SERVICE FILTER ✕
            </button>
          )}
          {allServiceTags.slice(0, 10).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveServiceTag(activeServiceTag === tag ? '' : tag)}
              className={`px-2 py-0.5 border cursor-pointer uppercase ${
                activeServiceTag === tag
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-[#F9F9F7] text-[#555555] border-[#CCCCCC] hover:border-[#111111]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Loading & Error States */}
      {loading && (
        <div className="border border-[#111111] p-8 text-center font-mono text-xs bg-[#F9F9F7]">
          [QUERYING REGIONAL HEALTHCARE FACILITIES FROM SUPABASE...]
        </div>
      )}

      {error && (
        <div className="border border-[#CC0000] p-4 font-mono text-xs text-[#CC0000] bg-[#FFF5F5]">
          <strong>ERROR LOADING DIRECTORY:</strong> {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredFacilities.length === 0 && (
        <div className="border border-dashed border-[#888888] p-8 text-center font-serif text-sm text-[#777777]">
          No regional health facilities match your search criteria. Try clearing the condition search filter.
        </div>
      )}

      {/* Facilities Cards Grid */}
      {!loading && !error && filteredFacilities.length > 0 && (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {filteredFacilities.map((facility, index) => {
            const isSelected = selectedFacilityId === facility.id;
            const isClosest = index === 0;

            return (
              <div
                key={facility.id}
                onClick={() => handleCardClick(facility)}
                className={`border-2 p-5 flex flex-col justify-between cursor-pointer transition-none ${
                  isSelected
                    ? 'border-[#111111] bg-[#111111] text-[#F9F9F7]'
                    : 'border-[#111111] bg-[#F9F9F7] hover:bg-[#EFEFEA] text-[#111111]'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Meta Bar */}
                  <div className="flex items-center justify-between border-b pb-2 text-xs font-mono">
                    <span className={isSelected ? 'text-[#AAAAAA]' : 'text-[#777777]'}>
                      FAC-0{facility.id} • {facility.type?.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1">
                      {isClosest && (
                        <span className="bg-[#CC0000] text-white text-[9px] font-bold px-1.5 py-0.2 uppercase">
                          PROXIMITY LEADER
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                        isSelected ? 'bg-[#F9F9F7] text-[#111111]' : 'bg-[#111111] text-white'
                      }`}>
                        {isSelected ? 'SELECTED' : 'AVAILABLE'}
                      </span>
                    </div>
                  </div>

                  {/* Facility Name & Location */}
                  <div>
                    <h4 className="font-serif font-black text-lg md:text-xl leading-snug">
                      {facility.name}
                    </h4>
                    
                    {/* Geospatial Distance & ETA Matrix */}
                    <div className={`font-mono text-xs mt-1 flex items-center gap-2 ${
                      isSelected ? 'text-[#DDDDDD]' : 'text-[#555555]'
                    }`}>
                      <span className="font-bold text-[#111111] bg-[#EAE8E2] px-1.5 py-0.2 border border-[#999999]">
                        📍 {facility.distanceKm !== null ? `${facility.distanceKm} KM` : 'PROXIMATE'}
                      </span>
                      <span>•</span>
                      <span>ETA: ~{facility.etaMinutes || 10} MINS VIA 108 AMBULANCE</span>
                    </div>
                  </div>

                  {/* Capabilities & Available Services */}
                  <div>
                    <div className={`font-mono text-[10px] uppercase font-bold mb-1.5 ${
                      isSelected ? 'text-[#AAAAAA]' : 'text-[#666666]'
                    }`}>
                      EQUIPPED CLINICAL CAPABILITIES:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(facility.available_services || []).map((service, idx) => (
                        <span
                          key={idx}
                          className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                            isSelected
                              ? 'border-[#444444] bg-[#222222] text-[#F9F9F7]'
                              : 'border-[#111111] bg-[#EAE8E2] text-[#111111]'
                          }`}
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="pt-4 mt-4 border-t border-dashed border-[#888888] flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] uppercase text-[#777777]">
                    CLICK TO DISPATCH REFERRAL
                  </span>
                  <span className={`font-bold underline ${isSelected ? 'text-white' : 'text-[#111111]'}`}>
                    [REFER PATIENT →]
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DISPATCH CONFIRMATION MODAL / DRAWER */}
      {confirmingFacility && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F9F9F7] border-4 border-[#111111] p-6 md:p-8 max-w-xl w-full shadow-2xl space-y-5 font-serif text-[#111111]">
            <div className="border-b-2 border-[#111111] pb-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-[#777777]">
                  EMERGENCY REFERRAL DISPATCH ORDER
                </span>
                <h3 className="text-2xl font-bold font-serif uppercase text-[#111111]">
                  Confirm Patient Transfer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingFacility(null)}
                className="font-mono font-bold text-sm text-[#777777] hover:text-[#111111] border border-[#111111] px-2 py-0.5 bg-[#EAE8E2]"
              >
                ✕ ESC
              </button>
            </div>

            {/* Target Facility Summary */}
            <div className="border-2 border-[#111111] p-4 bg-[#EAE8E2] space-y-2">
              <div className="font-mono text-[10px] font-bold uppercase text-[#555555]">
                TARGET RECEIVING HEALTHCARE INSTITUTION:
              </div>
              <div className="text-xl font-bold font-serif text-[#111111]">
                {confirmingFacility.name}
              </div>
              <div className="font-mono text-xs text-[#444444] flex items-center gap-2">
                <span>FACILITY ID: FAC-0{confirmingFacility.id}</span>
                <span>•</span>
                <span>TIER: {confirmingFacility.type}</span>
                <span>•</span>
                <span className="font-bold">DISTANCE: {confirmingFacility.distanceKm || 5.0} KM (~{confirmingFacility.etaMinutes || 12} MINS)</span>
              </div>
            </div>

            {/* Active Patient Context */}
            {patientContext && (
              <div className="border border-[#111111] p-3.5 bg-[#F9F9F7] font-mono text-xs space-y-1">
                <div className="font-bold uppercase text-[#111111] border-b border-[#111111] pb-1 mb-1.5 flex justify-between">
                  <span>ACTIVE PATIENT DOSSIER</span>
                  {patientContext.urgency_score && (
                    <span className="bg-[#CC0000] text-white px-1.5 py-0.2 text-[9px] uppercase">
                      {patientContext.urgency_score} SEVERITY
                    </span>
                  )}
                </div>
                <div><strong>NAME / ID:</strong> {patientContext.patientName || 'UNREGISTERED CASUALTY'}</div>
                {patientContext.patientAge && <div><strong>AGE & GENDER:</strong> {patientContext.patientAge}</div>}
                {patientContext.symptoms && (
                  <div className="text-[#444444] text-[11px] mt-1 pt-1 border-t border-[#DDDDDD] line-clamp-2">
                    <strong>PRESENTING SYMPTOMS:</strong> {patientContext.symptoms}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation Directives */}
            <p className="font-serif text-xs text-[#555555] italic leading-relaxed">
              By confirming, this patient's clinical triage report, acute symptoms, vital signs, and chronic medical history will be electronically docked and transmitted to the receiving doctor at {confirmingFacility.name}.
            </p>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-[#111111] flex items-center justify-end gap-3 font-mono">
              <button
                type="button"
                onClick={() => setConfirmingFacility(null)}
                className="btn-secondary py-2.5 px-4 text-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleFinalDispatch}
                className="btn-primary py-2.5 px-5 text-xs font-bold uppercase flex items-center gap-2 bg-[#CC0000] text-white hover:bg-[#AA0000]"
              >
                <span>⚡ DISPATCH PATIENT RECORD</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
