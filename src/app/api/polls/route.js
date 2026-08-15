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

function normalizePoll(row) {
  let payload = {};

  if (typeof row?.content === "string") {
    try {
      payload = JSON.parse(row.content);
    } catch {
      payload = {};
    }
  }

  if (payload.kind !== "poll") {
    return null;
  }

  return {
    id: row.id,
    subject: payload.subject || "",
    action: payload.action || "",
    deadline: payload.deadline || "",
    resolution_source: payload.resolution_source || "",
    status: payload.status || "active",
    creator_id: payload.creator_id || null,
    created_at: row.created_at || row.inserted_at || null,
    preview: payload.preview || `${payload.subject || ""} ${payload.action || ""}`.trim(),
  };
}

export async function GET() {
  if (!supabase) {
    return errorResponse("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return errorResponse(error.message);
  }

  const polls = (data || [])
    .map(normalizePoll)
    .filter(Boolean)
    .sort((left, right) => Number(new Date(right.created_at || 0)) - Number(new Date(left.created_at || 0)));

  return new Response(JSON.stringify(polls), {
    status: 200,
    headers: jsonHeaders,
  });
}

export async function POST(request) {
  if (!supabase) {
    return errorResponse("Supabase is not configured.");
  }

  try {
    const body = await request.json();
    const subject = body?.subject?.trim();
    const action = body?.action?.trim();
    const deadline = body?.deadline?.trim();
    const resolutionSource = body?.resolution_source?.trim();

    if (!subject || !action || !deadline || !resolutionSource) {
      return errorResponse("Please complete every poll field.", 400);
    }

    const preview = `Will ${subject} ${action} by ${deadline}? Resolves via ${resolutionSource}.`;
    const payload = {
      kind: "poll",
      subject,
      action,
      deadline,
      resolution_source: resolutionSource,
      preview,
      status: "active",
      creator_id: body?.creator_id || null,
    };

    const { data, error } = await supabase
      .from("posts")
      .insert({ content: JSON.stringify(payload) })
      .select("id, content, created_at")
      .single();

    if (error) {
      return errorResponse(error.message);
    }

    return new Response(JSON.stringify(normalizePoll(data)), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error");
  }
}
