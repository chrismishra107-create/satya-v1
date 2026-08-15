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

export async function GET(request) {
  if (!supabase) {
    return errorResponse("Supabase is not configured.");
  }

  const { searchParams } = new URL(request.url);
  const pollId = searchParams.get("poll_id");

  if (!pollId) {
    return errorResponse("Missing poll id", 400);
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, content, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message);
  }

  const comments = (data || [])
    .map((row) => {
      try {
        const payload = JSON.parse(row.content || "{}") || {};
        if (payload.kind !== "comment" || payload.poll_id !== pollId) {
          return null;
        }
        return {
          id: row.id,
          text: payload.text || "",
          created_at: row.created_at || null,
          user: payload.user || "Anonymous",
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return new Response(JSON.stringify(comments), { status: 200, headers: jsonHeaders });
}

export async function POST(request) {
  if (!supabase) {
    return errorResponse("Supabase is not configured.");
  }

  try {
    const body = await request.json();
    const pollId = body?.poll_id;
    const text = body?.text?.trim();
    const user = body?.user?.trim() || "Anonymous";

    if (!pollId || !text) {
      return errorResponse("Please add a comment.", 400);
    }

    const payload = {
      kind: "comment",
      poll_id: pollId,
      text,
      user,
    };

    const { error } = await supabase.from("posts").insert({ content: JSON.stringify(payload) });

    if (error) {
      return errorResponse(error.message);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error");
  }
}
