import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center px-4 py-12 font-serif text-[#111111]">
      <div className="max-w-3xl w-full border-4 border-[#111111] bg-[#F9F9F7] p-8 md:p-14 text-center space-y-8 shadow-none">
        
        {/* Header Eyebrow */}
        <div className="border-b border-[#111111] pb-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#555555]">
            COMMUNITY HEALTHCARE TRIAGE SYSTEM
          </span>
        </div>

        {/* Core Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tight text-[#111111] leading-tight">
            Rural Medical Triage & Clinical Dispatch
          </h1>
          
          {/* Single Clean Descriptive Sentence */}
          <p className="font-serif text-lg md:text-xl text-[#333333] max-w-2xl mx-auto leading-relaxed">
            Instant point-of-care symptom analysis, emergency severity scoring, and immediate hospital referral guidance for rural healthcare workers.
          </p>
        </div>

        {/* Primary Call-to-Action */}
        <div className="pt-4 border-t border-[#111111] flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/triage"
            className="btn-primary w-full sm:w-auto px-8 py-4 text-sm font-bold tracking-wider"
          >
            LAUNCH ASHA FIELD DOCKET
          </Link>

          <Link
            to="/facilities"
            className="btn-secondary w-full sm:w-auto px-6 py-4 text-sm font-bold tracking-wider"
          >
            VIEW FACILITIES DIRECTORY
          </Link>
        </div>

        {/* Subtle Footer Note */}
        <div className="pt-2">
          <p className="font-mono text-[11px] text-[#777777] uppercase tracking-wider">
            FOR EMERGENCY DISPATCH ASSISTANCE • DIAL 108 / 102
          </p>
        </div>

      </div>
    </div>
  );
}
