/** Plays a short beep and vibrates the device when a barcode is detected */
export function triggerScanFeedback(): void {
  // Vibrate (works on Android, ignored on iOS Safari)
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }

  // Short beep via Web Audio API (works on all modern browsers)
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = 1200;
    gain.gain.value = 0.3;

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.stop(ctx.currentTime + 0.15);

    // Clean up
    oscillator.onended = () => {
      ctx.close();
    };
  } catch {
    // Audio not available — silent fail
  }
}
