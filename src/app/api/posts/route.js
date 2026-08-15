import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const jsonHeaders = { "Content-Type": "application/json" };

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

const errorResponse = (message, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders,
  });

const TEXT_COLUMNS = ["content", "text", "body", "message", "post"];

function normalizePost(post) {
  const text = post.content ?? post.text ?? post.body ?? post.message ?? post.post ?? "";
  return {
    id: post.id,
    user: "Anonymous",
    text,
    created_at: post.created_at ?? post.inserted_at ?? null,
  };
}

async function tryInsertPost(text) {
  let lastError = null;

  for (const textColumn of TEXT_COLUMNS) {
    const payload = { [textColumn]: text };
    const result = await supabase.from("posts").insert(payload).select("*").single();

    if (!result.error) {
      return { data: result.data };
    }

    const message = (result.error.message || "").toLowerCase();
    if (
      message.includes("column") ||
      message.includes("undefined column") ||
      message.includes("invalid input") ||
      message.includes("null value in column")
    ) {
      lastError = result.error;
      continue;
    }

    return { error: result.error };
  }

  return { error: lastError ?? { message: "Unable to write post to Supabase." } };
}

export async function GET() {
  if (!supabase) {
    return errorResponse("Missing Supabase environment variables.");
  }

  let response = await supabase
    .from("posts")
    .select("id, content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (response.error && response.error.message?.includes("column \"created_at\" does not exist")) {
    response = await supabase
      .from("posts")
      .select("id, content, inserted_at")
      .order("inserted_at", { ascending: false })
      .limit(50);
  }

  if (response.error) {
    return errorResponse(response.error.message);
  }

  return new Response(JSON.stringify((response.data ?? []).map(normalizePost)), {
    status: 200,
    headers: jsonHeaders,
  });
}

export async function POST(request) {
  if (!supabase) {
    return errorResponse("Missing Supabase environment variables.");
  }

  try {
    const body = await request.json();
    const text = body?.content?.trim();

    if (!text) {
      return errorResponse("Post content is required.", 400);
    }

    const { data, error } = await tryInsertPost(text);
    if (error) {
      return errorResponse(error.message);
    }

    return new Response(JSON.stringify(normalizePost(data)), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
}
