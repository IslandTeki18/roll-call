import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Expo/React Native Supabase client
 * - Uses AsyncStorage for session persistence
 * - Disables URL parsing for RN
 * - Auto-refreshes tokens in background
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail fast in dev; avoids silent auth issues
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

let _client: SupabaseClient | null = null;

export const supabase = (() => {
  if (_client) return _client;

  _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "rollcall-rn" },
    },
  });

  return _client;
})();

/**
 * Helpers
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

/**
 * Subscribe to auth changes (login/logout/token refresh)
 * Usage:
 * const sub = onAuthState((event, session) => {...})
 * sub.unsubscribe()
 */
export function onAuthState(
  cb: (
    event: Parameters<typeof supabase.auth.onAuthStateChange>[0] extends (
      ...args: infer P
    ) => any
      ? P[0]
      : never,
    session: any
  ) => void
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) =>
    cb(event as any, session)
  );
  return data.subscription;
}
