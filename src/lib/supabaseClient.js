export const createClient = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );

    const dummyError = async () => ({
      error: {
        message:
          "Missing Supabase keys. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
    });

    return {
      auth: {
        signInWithPassword: dummyError,
        signUp: dummyError,
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        }),
      },
    };
  }

  const { createClient: createBrowserSupabaseClient } =
    await import("@supabase/supabase-js");

  return createBrowserSupabaseClient(supabaseUrl, supabaseKey);
};
