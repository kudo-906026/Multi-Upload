import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;
let cachedConfigError: string | null = null;
let cachedConfig: AuthConfig | null = null;
let isConfigLoaded = false;

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Validates whether a given string is a valid HTTP or HTTPS URL.
 */
function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetches runtime configuration directly from the backend /api/config endpoint.
 * Does NOT rely on build-time VITE_ environment variables.
 */
export async function loadRuntimeConfig(): Promise<{
  client: SupabaseClient | null;
  error: string | null;
  config: AuthConfig | null;
}> {
  if (supabaseInstance && cachedConfig) {
    return { client: supabaseInstance, error: null, config: cachedConfig };
  }

  try {
    console.log('[SupabaseInit] Fetching runtime configuration from /api/config...');
    const res = await fetch('/api/config');
    
    if (!res.ok) {
      const errorMsg = `Failed to fetch /api/config: HTTP ${res.status} ${res.statusText}`;
      console.error(`[OmniPost Config Error] ${errorMsg}`);
      cachedConfigError = errorMsg;
      isConfigLoaded = true;
      return { client: null, error: errorMsg, config: null };
    }

    const data = await res.json();
    
    // Support both direct uppercase keys and lowercase fallback
    const rawUrl = (data?.SUPABASE_URL || data?.data?.supabaseUrl || '').trim();
    const rawAnonKey = (data?.SUPABASE_ANON_KEY || data?.data?.supabaseAnonKey || '').trim();

    // Check for missing SUPABASE_URL
    if (!rawUrl || rawUrl.includes('<your-') || rawUrl === '') {
      const err = 'Config missing: SUPABASE_URL';
      console.error(`[OmniPost Config Error] ${err}. Received value: "${rawUrl}"`);
      cachedConfigError = err;
      isConfigLoaded = true;
      return { client: null, error: err, config: null };
    }

    // Check for missing SUPABASE_ANON_KEY
    if (!rawAnonKey || rawAnonKey.includes('<your-') || rawAnonKey === '') {
      const err = 'Config missing: SUPABASE_ANON_KEY';
      console.error(`[OmniPost Config Error] ${err}`);
      cachedConfigError = err;
      isConfigLoaded = true;
      return { client: null, error: err, config: null };
    }

    // Validate URL structure
    if (!isValidHttpUrl(rawUrl)) {
      const err = `Config invalid: SUPABASE_URL "${rawUrl}" is not a valid HTTP(S) URL`;
      console.error(`[OmniPost Config Error] ${err}`);
      cachedConfigError = err;
      isConfigLoaded = true;
      return { client: null, error: err, config: null };
    }

    // Initialize the client safely
    try {
      supabaseInstance = createClient(rawUrl, rawAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });

      console.log(`[SupabaseInit] Successfully connected to Supabase: ${rawUrl}`);
      cachedConfig = { supabaseUrl: rawUrl, supabaseAnonKey: rawAnonKey };
      cachedConfigError = null;
      isConfigLoaded = true;

      return {
        client: supabaseInstance,
        error: null,
        config: cachedConfig,
      };
    } catch (clientCreationErr: any) {
      const err = `Failed to initialize Supabase client: ${clientCreationErr.message || 'Unknown error'}`;
      console.error(`[OmniPost Config Error] ${err}`, clientCreationErr);
      cachedConfigError = err;
      isConfigLoaded = true;
      return { client: null, error: err, config: null };
    }
  } catch (networkErr: any) {
    const err = `Network error connecting to /api/config: ${networkErr.message || 'Cannot reach backend'}`;
    console.error(`[OmniPost Config Error] ${err}`, networkErr);
    cachedConfigError = err;
    isConfigLoaded = true;
    return { client: null, error: err, config: null };
  }
}

/**
 * Returns the singleton Supabase client or null if not yet configured.
 * Safely awaits runtime config loading without crashing.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (supabaseInstance) return supabaseInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const result = await loadRuntimeConfig();
    return result.client;
  })();

  return initPromise;
}

/**
 * Inspect the current configuration status.
 */
export function getConfigStatus(): {
  isLoaded: boolean;
  configError: string | null;
  hasClient: boolean;
} {
  return {
    isLoaded: isConfigLoaded,
    configError: cachedConfigError,
    hasClient: Boolean(supabaseInstance),
  };
}

/**
 * Reset config state for retrying.
 */
export function resetConfigState() {
  supabaseInstance = null;
  cachedConfig = null;
  initPromise = null;
  cachedConfigError = null;
  isConfigLoaded = false;
}

/**
 * Returns current access token (JWT) to attach to Authorization header.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const client = await getSupabase();
    if (!client) return null;

    const { data: { session } } = await client.auth.getSession();
    return session?.access_token || null;
  } catch (err) {
    console.warn('[SupabaseAuth] getAccessToken error:', err);
    return null;
  }
}

/**
 * Returns current authenticated user safely.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const client = await getSupabase();
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch (err) {
    console.warn('[SupabaseAuth] getCurrentUser error:', err);
    return null;
  }
}

/**
 * Sign in with email and password safely.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error?: string }> {
  try {
    const client = await getSupabase();
    if (!client) {
      return {
        user: null,
        error: cachedConfigError || 'Config missing: SUPABASE_ANON_KEY. Please configure your Supabase variables in Render.',
      };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user };
  } catch (err: any) {
    return { user: null, error: err.message || 'An error occurred during sign-in' };
  }
}

/**
 * Sign up with email and password safely.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; message?: string; error?: string }> {
  try {
    const client = await getSupabase();
    if (!client) {
      return {
        user: null,
        error: cachedConfigError || 'Config missing: SUPABASE_ANON_KEY. Please configure your Supabase variables in Render.',
      };
    }

    const { data, error } = await client.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    const needsConfirmation = !data.session && data.user && data.user.identities && data.user.identities.length > 0;

    return {
      user: data.user,
      message: needsConfirmation
        ? 'Account created! Please check your email for the confirmation link to sign in.'
        : 'Account created successfully!',
    };
  } catch (err: any) {
    return { user: null, error: err.message || 'An error occurred during sign-up' };
  }
}

/**
 * Sign in with Google OAuth via Supabase Auth safely.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    const client = await getSupabase();
    if (!client) {
      return { error: cachedConfigError || 'Config missing: SUPABASE_ANON_KEY' };
    }

    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) return { error: error.message };
    return {};
  } catch (err: any) {
    return { error: err.message || 'Failed to initialize Google Sign-In' };
  }
}

/**
 * Trigger password reset email safely.
 */
export async function resetPasswordForEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSupabase();
    if (!client) {
      return { success: false, error: cachedConfigError || 'Config missing: SUPABASE_ANON_KEY' };
    }

    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?reset_password=true`,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to request password reset' };
  }
}

/**
 * Sign out the current user safely.
 */
export async function signOutUser(): Promise<void> {
  try {
    const client = await getSupabase();
    if (!client) return;
    await client.auth.signOut();
  } catch (err) {
    console.warn('[SupabaseAuth] signOutUser error:', err);
  }
}
