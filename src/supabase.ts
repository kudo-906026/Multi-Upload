import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Initializes and returns the singleton Supabase client.
 * Tries environment variables first, falls back to fetching public config from /api/config/auth.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (supabaseInstance) return supabaseInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    let anonKey = (
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim();

    if (!url || !anonKey) {
      try {
        const res = await fetch('/api/config/auth');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            url = json.data.supabaseUrl || url;
            anonKey = json.data.supabaseAnonKey || anonKey;
          }
        }
      } catch (err) {
        console.warn('[SupabaseClient] Could not fetch public auth config:', err);
      }
    }

    if (!url || !anonKey) {
      console.warn('[SupabaseClient] SUPABASE_URL or SUPABASE_ANON_KEY not configured yet.');
      return null;
    }

    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return supabaseInstance;
  })();

  return initPromise;
}

/**
 * Returns current access token (JWT) to attach to Authorization header.
 */
export async function getAccessToken(): Promise<string | null> {
  const client = await getSupabase();
  if (!client) return null;

  try {
    const { data: { session } } = await client.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Returns current authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const client = await getSupabase();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; error?: string }> {
  const client = await getSupabase();
  if (!client) return { user: null, error: 'Supabase client not initialized. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.' };

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }
  return { user: data.user };
}

/**
 * Sign up with email and password.
 */
export async function signUpWithEmail(email: string, password: string): Promise<{ user: User | null; message?: string; error?: string }> {
  const client = await getSupabase();
  if (!client) return { user: null, error: 'Supabase client not initialized. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.' };

  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  // If email confirmation is enabled on Supabase project
  const needsConfirmation = !data.session && data.user && data.user.identities && data.user.identities.length > 0;

  return {
    user: data.user,
    message: needsConfirmation
      ? 'Account created! Please check your email for the confirmation link to sign in.'
      : 'Account created successfully!',
  };
}

/**
 * Sign in with Google OAuth via Supabase Auth.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  const client = await getSupabase();
  if (!client) return { error: 'Supabase client not initialized.' };

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) return { error: error.message };
  return {};
}

/**
 * Trigger password reset email.
 */
export async function resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const client = await getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized.' };

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/?reset_password=true`,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  const client = await getSupabase();
  if (!client) return;
  await client.auth.signOut();
}
