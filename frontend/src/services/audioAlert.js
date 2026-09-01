/**
 * Web Audio API Emergency Siren & Escalation Chime Generator
 * Synthesizes high-urgency multi-frequency alarm tones natively in the browser
 * with zero external audio assets required.
 */

let audioCtx = null;
let sirenInterval = null;
let isAlarmActive = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Triggers a persistent emergency escalation siren loop (580Hz / 880Hz alternating pulses).
 */
export function startEmergencyAlarm() {
  if (isAlarmActive) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  isAlarmActive = true;
  let toggle = false;

  const playPulse = () => {
    if (!isAlarmActive) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(toggle ? 880 : 587.33, ctx.currentTime);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      toggle = !toggle;
    } catch (e) {
      console.warn('Audio alarm playback error:', e);
    }
  };

  playPulse();
  sirenInterval = setInterval(playPulse, 450);
}

/**
 * Silences and halts the active emergency siren.
 */
export function stopEmergencyAlarm() {
  isAlarmActive = false;
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
}

/**
 * Plays a single subtle two-tone notification chime for routine docket arrival.
 */
export function playNotificationChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.15); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.4);
  } catch (e) {}
}

export default {
  startEmergencyAlarm,
  stopEmergencyAlarm,
  playNotificationChime,
};
