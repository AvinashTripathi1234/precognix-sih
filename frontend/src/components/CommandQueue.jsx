import React from 'react';

export default function CommandQueue({
  patients = [],
  localFacilityQueue = [],
  currentPage = 1,
  totalPages = 1,
  searchQuery = '',
  filterUrgency = 'all',
  loading = false,
  onSearchChange,
  onFilterChange,
  onPageChange,
  onSelectPatient,
  onOpenWalkIn,
  onDischargeLocalPatient
}) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 font-serif text-black dark:text-[#f5f2eb]">
      
      {/* 1. TOP ACTION BAR: MASSIVE WALK-IN REGISTRATION TRIGGER */}
      <div className="w-full">
        <button
          type="button"
          onClick={onOpenWalkIn}
          className="w-full py-4 px-6 bg-black dark:bg-white text-white dark:text-black font-mono font-black text-sm md:text-base uppercase tracking-wider border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:bg-[#222222] dark:hover:bg-[#EAE8E2] cursor-pointer rounded-none flex items-center justify-center gap-3 transition-all"
        >
          <span className="text-xl leading-none">＋</span>
          <span>[ + REGISTER DIRECT WALK-IN PATIENT (CASUALTY INTAKE) ]</span>
        </button>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS BAR (STICKY BRUTALIST BAR) */}
      <div className="border-4 border-black dark:border-white p-4 bg-[#F9F9F7] dark:bg-[#181818] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3 rounded-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Live Search Input */}
          <div className="flex-1">
            <div className="relative font-mono">
              <input
                type="text"
                placeholder="SEARCH QUEUE BY NAME, CASE ID (TR-XXXX), AADHAAR, OR SYMPTOMS..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 border-2 border-black dark:border-white py-2.5 px-3 rounded-none font-bold text-xs uppercase focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white"
                >
                  [CLEAR]
                </button>
              )}
            </div>
          </div>

          {/* Quick Urgency Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`py-2 px-3 border-2 border-black dark:border-white uppercase rounded-none cursor-pointer ${
                filterUrgency === 'all'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-black'
                  : 'bg-white dark:bg-[#121212] text-black dark:text-white hover:bg-[#EAE8E2]'
              }`}
            >
              [ ALL PATIENTS ]
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('Critical')}
              className={`py-2 px-3 border-2 border-black dark:border-white uppercase rounded-none cursor-pointer ${
                filterUrgency === 'Critical'
                  ? 'bg-[#CC0000] text-white font-black'
                  : 'bg-white dark:bg-[#121212] text-[#CC0000] hover:bg-[#FFF0F0]'
              }`}
            >
              [ 🚨 CRITICAL ]
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('High')}
              className={`py-2 px-3 border-2 border-black dark:border-white uppercase rounded-none cursor-pointer ${
                filterUrgency === 'High'
                  ? 'bg-[#E5A000] text-black font-black'
                  : 'bg-white dark:bg-[#121212] text-[#885500] hover:bg-[#FFF8E8]'
              }`}
            >
              [ 🟨 URGENT ]
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('Moderate')}
              className={`py-2 px-3 border-2 border-black dark:border-white uppercase rounded-none cursor-pointer ${
                filterUrgency === 'Moderate'
                  ? 'bg-[#555555] text-white font-black'
                  : 'bg-white dark:bg-[#121212] text-black dark:text-white hover:bg-[#EAE8E2]'
              }`}
            >
              [ 🟩 ROUTINE ]
            </button>
          </div>
        </div>
      </div>

      {/* 3. THE COMMAND CONSOLE VERTICAL DATA TABLE (VIEW A) */}
      <section className="border-4 border-black dark:border-white bg-[#F9F9F7] dark:bg-[#181818] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-4">
        
        {/* Masthead */}
        <div className="border-b-2 border-black dark:border-white pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="step-badge">QUEUE</span>
            <h2 className="text-xl md:text-2xl font-serif font-black uppercase text-black dark:text-white">
              Command Console Patient Queue
            </h2>
          </div>
          <span className="text-xs font-mono font-bold bg-black dark:bg-white text-white dark:text-black px-2.5 py-1 uppercase">
            PAGE {currentPage} OF {totalPages} • {patients.length} PATIENTS
          </span>
        </div>

        {/* Table Container */}
        <div className="border-2 border-black dark:border-white overflow-x-auto bg-white dark:bg-[#121212]">
          <table className="w-full text-left font-serif text-xs border-collapse">
            <thead>
              <tr className="bg-[#111111] text-white font-mono text-[10px] uppercase border-b-2 border-black">
                <th className="p-3 border-r border-[#444444] text-center w-28">TRIAGE ALERT</th>
                <th className="p-3 border-r border-[#444444] w-64">PATIENT IDENTITY</th>
                <th className="p-3 border-r border-[#444444] w-48">PHYSIOLOGICAL VITALS</th>
                <th className="p-3 border-r border-[#444444]">CHIEF COMPLAINT &amp; PRESENTATION</th>
                <th className="p-3 border-r border-[#444444] text-center w-28">TIME IN QUEUE</th>
                <th className="p-3 text-right w-36">EVALUATION</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-[#CCCCCC] dark:divide-[#333333] font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center font-bold text-sm">
                    [ SYNCHRONIZING REAL-TIME TELEMETRY QUEUE... ]
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center font-bold text-sm text-[#777777]">
                    [ NO MATCHING PATIENTS FOUND IN THE ACTIVE INTAKE QUEUE ]
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const urgency = p.triage_priority || p.ai_urgency_score || 'ROUTINE';
                  const isCrit = urgency.toUpperCase().includes('CRIT');
                  const isUrg = urgency.toUpperCase().includes('HIGH') || urgency.toUpperCase().includes('URG');

                  // Left-border color indicator rule
                  const leftBorderClass = isCrit
                    ? 'border-l-8 border-l-red-600 bg-[#FFF5F5] dark:bg-[#2A1111]'
                    : isUrg
                    ? 'border-l-8 border-l-yellow-400 bg-[#FFFEF0] dark:bg-[#262411]'
                    : 'border-l-8 border-l-gray-400 bg-white dark:bg-[#1b1b1b]';

                  const pName = p.name || p.patient_name || p.clinical_data?.patient_name || 'WALK-IN CASUALTY';
                  const pAgeGender = `${p.age || '45'} YRS / ${p.gender || 'MALE'}`;
                  const pUid = p.patient_uid || p.aadhaar_number || 'XXXX-XXXX-XXXX';
                  const v = p.vitals || p.clinical_data?.vitals || {};
                  const vitalsSummary = `BP: ${v.bp || '120/80'} | HR: ${v.hr || v.pulse || '75'} | SpO2: ${v.spo2 || v.spO2 || '98'}%`;
                  const complaint = p.complaint || p.symptoms_text || p.symptoms || 'Clinical presentation recorded.';
                  const source = p.source || 'ASHA';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPatient(p)}
                      className={`hover:bg-[#EAE8E2] dark:hover:bg-[#2c2c2c] transition-none cursor-pointer ${leftBorderClass}`}
                    >
                      {/* Priority Alert Badge */}
                      <td className="p-3 text-center border-r border-[#E0E0E0] dark:border-[#333333]">
                        <span className={`px-2 py-1 font-mono font-black text-[9px] uppercase tracking-wider block ${
                          isCrit
                            ? 'bg-[#CC0000] text-white'
                            : isUrg
                            ? 'bg-[#E5A000] text-black'
                            : 'bg-black dark:bg-white text-white dark:text-black'
                        }`}>
                          {urgency}
                        </span>
                        <span className="text-[8px] font-mono text-[#777777] dark:text-[#aaaaaa] mt-1 block">
                          ID: {p.id}
                        </span>
                      </td>

                      {/* Patient Identity */}
                      <td className="p-3 border-r border-[#E0E0E0] dark:border-[#333333]">
                        <div className="font-sans font-black text-sm text-black dark:text-white uppercase leading-tight">
                          {pName}
                        </div>
                        <div className="text-[11px] font-mono text-[#555555] dark:text-[#aaaaaa] mt-0.5">
                          {pAgeGender}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px]">
                          <span className="bg-black dark:bg-white text-white dark:text-black px-1.5 font-bold uppercase">
                            {source}
                          </span>
                          <span className="text-[#777777] dark:text-[#aaaaaa]">
                            UID: {pUid}
                          </span>
                        </div>
                      </td>

                      {/* Physiological Vitals */}
                      <td className="p-3 border-r border-[#E0E0E0] dark:border-[#333333] font-mono text-xs font-bold text-black dark:text-white">
                        {vitalsSummary}
                      </td>

                      {/* Chief Complaint */}
                      <td className="p-3 border-r border-[#E0E0E0] dark:border-[#333333] font-sans font-medium text-xs text-black dark:text-white line-clamp-2">
                        {complaint}
                      </td>

                      {/* Time in Queue */}
                      <td className="p-3 text-center border-r border-[#E0E0E0] dark:border-[#333333] font-mono text-[11px] text-[#555555] dark:text-[#aaaaaa]">
                        {new Date(p.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Action Button */}
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient(p);
                          }}
                          className="btn-primary py-1.5 px-3 font-mono text-[11px] font-black uppercase border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-none cursor-pointer whitespace-nowrap"
                        >
                          [ EVALUATE &gt; ]
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. BASE BRUTALIST PAGINATION BAR */}
        <div className="border-t-2 border-black dark:border-white pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="text-[#555555] dark:text-[#aaaaaa]">
            SHOWING <span className="font-bold text-black dark:text-white">{patients.length}</span> PATIENTS • COMMAND QUEUE SYNCED
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="py-2 px-3 bg-white dark:bg-[#121212] text-black dark:text-white border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-none cursor-pointer font-bold"
            >
              [ &lt; PREV ]
            </button>

            <span className="bg-black dark:bg-white text-white dark:text-black py-2 px-4 font-black uppercase">
              PAGE {currentPage} OF {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="py-2 px-3 bg-white dark:bg-[#121212] text-black dark:text-white border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-none cursor-pointer font-bold"
            >
              [ NEXT &gt; ]
            </button>
          </div>
        </div>
      </section>

      {/* 5. LOCAL FACILITY QUEUE (ADMITTED / OBSERVATION BEDS) */}
      {localFacilityQueue.length > 0 && (
        <section className="border-4 border-black dark:border-white bg-[#F9F9F7] dark:bg-[#181818] p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-4">
          <div className="border-b-2 border-black dark:border-white pb-3 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <span className="step-badge">BEDS</span>
              <h3 className="text-lg font-serif font-black uppercase text-black dark:text-white">
                Local Facility Ward (Admitted Observation Queue)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-[#E5A000] text-black px-2 py-0.5 uppercase">
              {localFacilityQueue.length} OCCUPIED BEDS
            </span>
          </div>

          <div className="border-2 border-black dark:border-white overflow-x-auto bg-white dark:bg-[#121212]">
            <table className="w-full text-left font-serif text-xs border-collapse">
              <thead>
                <tr className="bg-[#111111] text-white font-mono text-[10px] uppercase border-b-2 border-black">
                  <th className="p-2.5 border-r border-[#444444]">WARD / BED</th>
                  <th className="p-2.5 border-r border-[#444444]">PATIENT NAME</th>
                  <th className="p-2.5 border-r border-[#444444]">VITALS SUMMARY</th>
                  <th className="p-2.5 border-r border-[#444444]">ADMISSION DIAGNOSIS</th>
                  <th className="p-2.5 text-right">DISCHARGE ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CCCCCC] dark:divide-[#333333] font-mono text-xs">
                {localFacilityQueue.map((admitted, idx) => (
                  <tr key={idx} className="hover:bg-[#EAE8E2] dark:hover:bg-[#252525]">
                    <td className="p-2.5 font-bold border-r border-[#E0E0E0] dark:border-[#333333]">
                      <span className="bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 text-[10px]">
                        {admitted.bed || `BED-0${idx + 1}`}
                      </span>
                    </td>
                    <td className="p-2.5 font-sans font-bold border-r border-[#E0E0E0] dark:border-[#333333]">
                      {admitted.patient_name} ({admitted.age_gender})
                    </td>
                    <td className="p-2.5 border-r border-[#E0E0E0] dark:border-[#333333]">
                      {admitted.vitals_summary}
                    </td>
                    <td className="p-2.5 font-sans border-r border-[#E0E0E0] dark:border-[#333333]">
                      {admitted.chief_complaint}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onDischargeLocalPatient(admitted.patient_name)}
                        className="text-[#008844] hover:text-white hover:bg-[#008844] border border-[#008844] px-2 py-1 text-[10px] font-black uppercase rounded-none cursor-pointer"
                      >
                        [DISCHARGE BED]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
