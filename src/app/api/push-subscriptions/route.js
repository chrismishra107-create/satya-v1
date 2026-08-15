import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jsonHeaders = { "Content-Type": "application/json" };

function errorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders });
}

function getAuthorizationBearer(request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;
}

function createRouteSupabase(accessToken) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

export async function POST(request) {
  try {
    const accessToken = getAuthorizationBearer(request);
    if (!accessToken) {
      return errorResponse("Please sign in again before saving your subscription.", 401);
    }

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Supabase environment variables are missing.");
    }

    const client = createRouteSupabase(accessToken);
    const { data: { user }, error: authError } = await client.auth.getUser(accessToken);
    if (authError || !user) {
      return errorResponse("Your session expired. Please log in again.", 401);
    }

    const body = await request.json();
    const subscription = body?.subscription;
    if (!subscription) {
      return errorResponse("Missing subscription payload.", 400);
    }

    const { error } = await client.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        subscription,
      },
      { onConflict: ["user_id"] }
    );

    if (error) {
      return errorResponse(error.message);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error.");
  }
}
