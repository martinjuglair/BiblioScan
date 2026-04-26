import { useEffect, useState } from "react";
import { supabase } from "@infrastructure/supabase/client";

/**
 * Live count of people on the pre-launch waitlist. Shown discreetly under
 * the hero CTAs to give a "people are interested" social proof without
 * inventing fake numbers. Hidden until the count is >= MIN_DISPLAY so we
 * don't proudly display "3 people on the waitlist".
 */
const MIN_DISPLAY = 25;

export function WaitlistCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // RPC instead of a direct count(*) — the waitlist table has no
      // SELECT policy on purpose (we don't expose emails publicly), so
      // we go through a SECURITY DEFINER function that only returns the
      // count.
      const { data, error } = await supabase.rpc("count_waitlist");
      if (cancelled || error || data == null) return;
      const c = typeof data === "number" ? data : Number(data);
      if (Number.isFinite(c) && c >= MIN_DISPLAY) setCount(c);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count == null) return null;

  return (
    <p className="mt-3 text-xs font-semibold text-text-tertiary">
      ✨ <span className="text-text-primary">{count.toLocaleString("fr-FR")}</span> personnes attendent déjà l'app
    </p>
  );
}
