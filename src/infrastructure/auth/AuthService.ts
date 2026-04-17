import { supabase } from "@infrastructure/supabase/client";
import { Result } from "@domain/shared/Result";
import type { User, Session, Subscription } from "@supabase/supabase-js";

export class AuthService {
  async signIn(email: string, password: string): Promise<Result<User>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return Result.fail(error.message);
    return Result.ok(data.user);
  }

  async signUp(email: string, password: string, firstName?: string): Promise<Result<User>> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: firstName ? { data: { first_name: firstName } } : undefined,
    });
    if (error) return Result.fail(error.message);
    if (!data.user) return Result.fail("Erreur lors de la création du compte");
    return Result.ok(data.user);
  }

  async updateFirstName(firstName: string): Promise<Result<User>> {
    const { data, error } = await supabase.auth.updateUser({
      data: { first_name: firstName },
    });
    if (error) return Result.fail(error.message);
    return Result.ok(data.user);
  }

  getFirstName(user: User): string | null {
    return (user.user_metadata?.first_name as string) ?? null;
  }

  async resetPassword(email: string): Promise<Result<void>> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) return Result.fail(error.message);
    return Result.ok(undefined);
  }

  async updatePassword(newPassword: string): Promise<Result<void>> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return Result.fail(error.message);
    return Result.ok(undefined);
  }

  async signOut(): Promise<Result<void>> {
    const { error } = await supabase.auth.signOut();
    if (error) return Result.fail(error.message);
    return Result.ok(undefined);
  }

  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  async getUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  onAuthStateChange(callback: (user: User | null) => void): Subscription {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
    return data.subscription;
  }
}
