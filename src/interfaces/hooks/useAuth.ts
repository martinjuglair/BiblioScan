import { useState, useEffect, useCallback } from "react";
import { authService } from "@infrastructure/container";
import type { User } from "@supabase/supabase-js";

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    authService.getSession().then((session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const subscription = authService.onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    const result = await authService.signIn(email, password);
    if (!result.ok) {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    const result = await authService.signUp(email, password);
    if (!result.ok) {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await authService.signOut();
  }, []);

  return { user, loading, error, signIn, signUp, signOut };
}
