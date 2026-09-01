import React from 'react';
import FacilityDirectory from '../components/FacilityDirectory';

export default function FacilitiesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 font-serif text-[#111111]">
      <div className="border-b-4 border-[#111111] pb-3 mb-6">
        <div className="font-mono text-[11px] font-bold uppercase text-[#777777] mb-1">
          REGISTRY GAZETTE • SECTION IV
        </div>
        <h2 className="text-3xl md:text-4xl font-serif font-black text-[#111111]">
          Directory of Regional Medical Centers & Clinical Capabilities
        </h2>
        <p className="font-serif italic text-sm text-[#555555] mt-1">
          Official searchable directory indexing Community Health Centres (CHCs), District Hospitals, and Super-Specialty Medical Institutions by chronic condition requirements.
        </p>
      </div>

      <div className="border-2 border-[#111111] bg-[#F9F9F7] p-6">
        <FacilityDirectory compact={false} />
      </div>
    </div>
  );
}
