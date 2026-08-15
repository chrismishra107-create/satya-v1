import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const jsonHeaders = { "Content-Type": "application/json" };

function errorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders });
}

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return errorResponse("Not signed in.", 401);
    }

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Supabase environment variables are missing.");
    }

    const token = authorization.slice(7).trim();

    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const {
      data: { user },
    } = await client.auth.getUser(token);

    if (!user) {
      return errorResponse("Session expired.", 401);
    }

    const body = await request.json();
    const cardId = body?.cardId;
    const seconds = Number(body?.seconds);

    if (!cardId || !seconds || seconds <= 0 || seconds > 3600) {
      return errorResponse("Invalid tracking data.", 400);
    }

    const { error } = await client
      .from("read_sessions")
      .insert({ user_id: user.id, card_id: cardId, seconds: Math.round(seconds) });

    if (error) {
      return errorResponse(error.message);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error.");
  }
}