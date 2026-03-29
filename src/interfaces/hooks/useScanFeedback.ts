/** Plays a confirmation beep and vibrates the device when a barcode is detected */
export function triggerScanFeedback(): void {
  // Vibrate pattern: short-pause-short (works on Android, ignored on iOS Safari)
  if (navigator.vibrate) {
    navigator.vibrate([80, 50, 80]);
  }

  // Double beep via Web Audio API for a satisfying "scan confirmed" sound
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First beep — higher pitch
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.value = 1400;
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.start(now);
    osc1.stop(now + 0.1);

    // Second beep — even higher pitch, after a short gap
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.value = 1800;
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.25);

    // Clean up after both beeps finish
    osc2.onended = () => {
      ctx.close();
    };
  } catch {
    // Audio not available — silent fail
  }
}
