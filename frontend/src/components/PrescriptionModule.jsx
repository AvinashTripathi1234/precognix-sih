import React, { useState } from 'react';

// Essential Rural Healthcare Formulary Presets
const FORMULARY_PRESETS = [
  { name: 'Paracetamol', defaultDose: '500mg', defaultFreq: 'TDS (Thrice daily)', defaultDuration: '3 Days' },
  { name: 'Amoxicillin + Clavulanic Acid', defaultDose: '625mg', defaultFreq: 'BD (Twice daily)', defaultDuration: '5 Days' },
  { name: 'Aspirin (Loading Dose)', defaultDose: '300mg', defaultFreq: 'Stat (Immediate)', defaultDuration: 'Single dose' },
  { name: 'Clopidogrel (Loading Dose)', defaultDose: '300mg', defaultFreq: 'Stat (Immediate)', defaultDuration: 'Single dose' },
  { name: 'Salbutamol Nebulization', defaultDose: '2.5mg / 2.5ml', defaultFreq: 'SOS / Q4H', defaultDuration: '1 Day' },
  { name: 'ORS (Oral Rehydration Salts)', defaultDose: '1 Sachet in 1L Water', defaultFreq: 'Frequent sips', defaultDuration: '2 Days' },
  { name: 'Amlodipine', defaultDose: '5mg', defaultFreq: 'OD (Morning)', defaultDuration: '30 Days' },
  { name: 'Metformin', defaultDose: '500mg', defaultFreq: 'BD (Post-meals)', defaultDuration: '30 Days' },
  { name: 'Pantoprazole', defaultDose: '40mg', defaultFreq: 'OD (Empty stomach)', defaultDuration: '5 Days' },
  { name: 'Cetirizine', defaultDose: '10mg', defaultFreq: 'HS (Night)', defaultDuration: '3 Days' },
  { name: 'Azithromycin', defaultDose: '500mg', defaultFreq: 'OD (Once daily)', defaultDuration: '3 Days' },
  { name: 'Ciprofloxacin Eye/Ear Drops', defaultDose: '2 Drops', defaultFreq: 'TDS', defaultDuration: '5 Days' }
];

const DIAGNOSTIC_TEST_PRESETS = [
  '12-LEAD ECG TELEMETRY',
  'RANDOM BLOOD SUGAR (RBS)',
  'COMPLETE BLOOD COUNT (CBC)',
  'CHEST X-RAY (PA VIEW)',
  'MALARIA RAPID DIAGNOSTIC KIT (RDT)',
  'SPUTUM CBNAAT / GENEXPERT',
  'SERUM ELECTROLYTES & RENAL PANEL',
  'URINE ROUTINE & MICROSCOPY',
  'RAPID TROPONIN-I CARDIAC BIOMARKER',
  'ULTRASOUND (FAST / ABDOMEN)'
];

export default function PrescriptionModule({ prescriptions = [], diagnosticTests = [], onChange }) {
  const [selectedMed, setSelectedMed] = useState(FORMULARY_PRESETS[0].name);
  const [dosage, setDosage] = useState(FORMULARY_PRESETS[0].defaultDose);
  const [frequency, setFrequency] = useState(FORMULARY_PRESETS[0].defaultFreq);
  const [duration, setDuration] = useState(FORMULARY_PRESETS[0].defaultDuration);
  const [customMed, setCustomMed] = useState('');
  const [instructions, setInstructions] = useState('');

  // Handle Preset Drug Select
  const handleMedChange = (medName) => {
    setSelectedMed(medName);
    const found = FORMULARY_PRESETS.find((f) => f.name === medName);
    if (found) {
      setDosage(found.defaultDose);
      setFrequency(found.defaultFreq);
      setDuration(found.defaultDuration);
    }
  };

  // Add Medication Entry
  const handleAddMedication = (e) => {
    e.preventDefault();
    const finalMedName = customMed.trim() || selectedMed;
    if (!finalMedName) return;

    const newEntry = {
      id: `RX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      medication: finalMedName,
      dosage: dosage.trim() || 'Standard Dose',
      frequency: frequency.trim() || 'OD',
      duration: duration.trim() || '3 Days',
      instructions: instructions.trim() || 'Take as directed.'
    };

    const updatedPrescriptions = [...prescriptions, newEntry];
    if (onChange) {
      onChange({
        prescriptions: updatedPrescriptions,
        diagnosticTests
      });
    }

    setCustomMed('');
    setInstructions('');
  };

  // Remove Medication
  const handleRemoveMedication = (id) => {
    const updated = prescriptions.filter((p) => p.id !== id);
    if (onChange) {
      onChange({
        prescriptions: updated,
        diagnosticTests
      });
    }
  };

  // Toggle Diagnostic Test Chip
  const handleToggleTest = (testName) => {
    let updatedTests;
    if (diagnosticTests.includes(testName)) {
      updatedTests = diagnosticTests.filter((t) => t !== testName);
    } else {
      updatedTests = [...diagnosticTests, testName];
    }

    if (onChange) {
      onChange({
        prescriptions,
        diagnosticTests: updatedTests
      });
    }
  };

  return (
    <div className="border-2 border-black dark:border-white bg-[#F9F9F7] dark:bg-[#181818] p-5 space-y-5 rounded-none font-serif text-black dark:text-[#f5f2eb]">
      
      {/* Header */}
      <div className="border-b-2 border-black dark:border-white pb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono">
          <span className="step-badge">RX</span>
          <h3 className="font-serif font-black text-base text-black dark:text-white uppercase">
            Clinical Prescription &amp; Diagnostic Order Module
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold bg-black dark:bg-white text-white dark:text-black px-2 py-0.5 uppercase">
          {prescriptions.length} MEDICATIONS • {diagnosticTests.length} LAB ORDERS
        </span>
      </div>

      {/* 1. Quick-Select Essential Rural Formulary & Custom Drug Entry */}
      <form onSubmit={handleAddMedication} className="space-y-3 font-sans">
        <span className="font-sans font-black text-[10px] tracking-wider uppercase text-[#555555] dark:text-[#cccccc] block">
          1. ADD PHARMACEUTICAL PRESCRIPTION
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          
          {/* Formulary Select / Custom Input */}
          <div className="sm:col-span-5">
            <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
              SELECT MEDICATION (FORMULARY PRESET)
            </label>
            <select
              value={selectedMed}
              onChange={(e) => handleMedChange(e.target.value)}
              className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            >
              {FORMULARY_PRESETS.map((med) => (
                <option key={med.name} value={med.name}>
                  {med.name} ({med.defaultDose})
                </option>
              ))}
            </select>
          </div>

          {/* Or Custom Medication Name */}
          <div className="sm:col-span-3">
            <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
              OR CUSTOM DRUG NAME
            </label>
            <input
              type="text"
              placeholder="e.g. Doxycycline"
              value={customMed}
              onChange={(e) => setCustomMed(e.target.value)}
              className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 border-2 border-black dark:border-white p-2 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {/* Dosage */}
          <div className="sm:col-span-2">
            <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
              DOSAGE
            </label>
            <input
              type="text"
              required
              placeholder="500mg"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center"
            />
          </div>

          {/* Frequency */}
          <div className="sm:col-span-2">
            <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
              FREQUENCY
            </label>
            <input
              type="text"
              required
              placeholder="TDS / BD"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center"
            />
          </div>

          {/* Duration & Instructions */}
          <div className="sm:col-span-8">
            <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
              SPECIAL CLINICAL INSTRUCTIONS / FOOD PRECAUTIONS
            </label>
            <input
              type="text"
              placeholder="e.g. Take after food with warm water. Avoid dairy within 2 hours."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] placeholder-gray-500 border-2 border-black dark:border-white p-2 rounded-none font-medium focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          {/* Duration */}
          <div className="sm:col-span-2">
            <label className="block font-black text-[9px] uppercase tracking-wider text-[#555555] dark:text-[#aaaaaa] mb-1">
              DURATION
            </label>
            <input
              type="text"
              required
              placeholder="3 Days"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full font-mono text-xs bg-white text-black dark:bg-[#121212] dark:text-[#f5f2eb] border-2 border-black dark:border-white p-2 rounded-none font-bold focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-center"
            />
          </div>

          {/* Add Button */}
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-3 bg-black dark:bg-white text-white dark:text-black font-mono font-bold text-xs uppercase border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#333333] cursor-pointer rounded-none"
            >
              [ + ADD RX ]
            </button>
          </div>
        </div>
      </form>

      {/* Prescriptions Active Table */}
      {prescriptions.length > 0 && (
        <div className="border-2 border-black dark:border-white overflow-x-auto">
          <table className="w-full text-left font-serif text-xs border-collapse">
            <thead>
              <tr className="bg-[#111111] text-white font-mono text-[9px] uppercase border-b-2 border-black">
                <th className="p-2 border-r border-[#444444]">MEDICATION NAME</th>
                <th className="p-2 border-r border-[#444444] text-center">DOSAGE</th>
                <th className="p-2 border-r border-[#444444] text-center">FREQUENCY</th>
                <th className="p-2 border-r border-[#444444] text-center">DURATION</th>
                <th className="p-2 border-r border-[#444444]">INSTRUCTIONS</th>
                <th className="p-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CCCCCC] dark:divide-[#333333] font-mono text-xs">
              {prescriptions.map((rx) => (
                <tr key={rx.id} className="hover:bg-[#EAE8E2] dark:hover:bg-[#252525] bg-white dark:bg-[#1f1f1f]">
                  <td className="p-2 font-bold border-r border-[#E0E0E0] dark:border-[#333333] font-sans">
                    {rx.medication}
                  </td>
                  <td className="p-2 text-center border-r border-[#E0E0E0] dark:border-[#333333] font-bold">
                    {rx.dosage}
                  </td>
                  <td className="p-2 text-center border-r border-[#E0E0E0] dark:border-[#333333]">
                    {rx.frequency}
                  </td>
                  <td className="p-2 text-center border-r border-[#E0E0E0] dark:border-[#333333]">
                    {rx.duration}
                  </td>
                  <td className="p-2 border-r border-[#E0E0E0] dark:border-[#333333] text-[11px] text-[#555555] dark:text-[#cccccc]">
                    {rx.instructions || 'Standard'}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveMedication(rx.id)}
                      className="text-[#CC0000] hover:text-white hover:bg-[#CC0000] border border-[#CC0000] px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-none cursor-pointer"
                    >
                      [REMOVE]
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Diagnostic & Laboratory Investigation Orders (Quick-Toggle Chips) */}
      <div className="space-y-2 border-t-2 border-black dark:border-white pt-4">
        <div className="flex items-center justify-between font-sans font-black text-[10px] tracking-wider uppercase text-[#555555] dark:text-[#cccccc]">
          <span>2. ORDER DIAGNOSTIC &amp; POINT-OF-CARE INVESTIGATIONS (CLICK TO TOGGLE):</span>
          <span className="font-mono text-[9px]">{diagnosticTests.length} SELECTED</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[10px]">
          {DIAGNOSTIC_TEST_PRESETS.map((test) => {
            const isSelected = diagnosticTests.includes(test);
            return (
              <button
                key={test}
                type="button"
                onClick={() => handleToggleTest(test)}
                className={`p-2 text-left border-2 rounded-none transition-none cursor-pointer uppercase font-bold flex items-center justify-between ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-[#121212] text-black dark:text-white border-black dark:border-white hover:bg-[#EAE8E2]'
                }`}
              >
                <span className="truncate mr-1">{test}</span>
                <span className="font-mono text-xs font-black">{isSelected ? '✓' : '+'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
