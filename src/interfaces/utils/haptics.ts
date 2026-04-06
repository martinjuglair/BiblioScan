/**
 * Haptic feedback utility — uses Vibration API when available.
 * Gracefully no-ops on unsupported devices.
 */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently ignore — some browsers throw on vibrate
    }
  }
}

/** Light tap — button press, selection change */
export function hapticLight(): void {
  vibrate(10);
}

/** Medium — swipe confirmed, action taken */
export function hapticMedium(): void {
  vibrate(25);
}

/** Success — scan complete, save confirmed */
export function hapticSuccess(): void {
  vibrate([15, 50, 25]);
}

/** Error / destructive — delete, error */
export function hapticError(): void {
  vibrate([30, 40, 30]);
}
