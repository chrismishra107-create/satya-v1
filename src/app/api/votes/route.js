import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const jsonHeaders = { "Content-Type": "application/json" };

function errorResponse(message, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders,
  });
}

export async function POST(request) {
  if (!supabase) {
    return errorResponse("Supabase is not configured.");
  }

  try {
    const body = await request.json();
    const pollId = body?.poll_id;
    const choice = body?.choice;
    const confidence = body?.confidence;
    const userId = body?.user_id || "anonymous";

    if (!pollId || typeof choice !== "boolean" || !confidence) {
      return errorResponse("Please choose a vote and confidence level.", 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from("posts")
      .select("id, content")
      .eq("id", pollId)
      .limit(1);

    if (existingError || !existing?.length) {
      return errorResponse("Poll not found.", 404);
    }

    const votePayload = {
      poll_id: pollId,
      user_id: userId,
      choice,
      confidence,
      credits_staked: confidence === "high" ? 100 : confidence === "medium" ? 50 : 20,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("posts").insert({ content: JSON.stringify(votePayload) });

    if (error) {
      return errorResponse(error.message);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error");
  }
}
