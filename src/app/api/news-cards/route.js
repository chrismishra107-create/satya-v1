import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import {
  isMissingNewsCardsSetup,
  isValidNewsCategory,
  isValidNewsStatus,
  normalizeNewsCard,
} from "@/lib/newsCards";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@example.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

const jsonHeaders = { "Content-Type": "application/json" };

function errorResponse(message, status = 500, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: jsonHeaders,
  });
}

function isMissingAdminFlag(error) {
  const message = (error?.message || String(error)).toLowerCase();
  return message.includes("is_admin") && message.includes("does not exist");
}

function createRouteSupabase(accessToken) {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers,
    },
  });
}

function getAccessToken(request) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token || null;
}

async function getAdminState(request) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return {
      error: errorResponse("Please sign in again before creating a news card.", 401),
    };
  }

  const supabase = createRouteSupabase(accessToken);

  if (!supabase) {
    return {
      error: errorResponse("Supabase environment variables are missing."),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return {
      error: errorResponse("Your session expired. Please log in again.", 401),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    if (isMissingAdminFlag(profileError)) {
      return {
        error: errorResponse(
          "The admin column is missing in Supabase. Run the SQL setup shown on the admin page.",
          500,
          { needsSetup: true }
        ),
      };
    }

    return {
      error: errorResponse(profileError.message || "Unable to verify your admin access."),
    };
  }

  if (!profile?.is_admin) {
    return {
      error: errorResponse("This page is only for admin accounts.", 403),
    };
  }

  return {
    supabase,
    user,
  };
}

function applyCategoryFilter(query, category) {
  if (category === "student" || category === "business") {
    return query.or(`category.eq.${category},category.eq.both`);
  }

  if (category === "explore") {
    return query.or(`category.eq.explore,category.eq.both`);
  }

  if (category === "both") {
    return query.eq("category", "both");
  }

  return query;
}

export async function GET(request) {
  const supabase = createRouteSupabase();

  if (!supabase) {
    return errorResponse("Supabase environment variables are missing.");
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const includeDrafts = searchParams.get("includeDrafts") === "true";

  let queryClient = supabase;

  if (includeDrafts) {
    const adminState = await getAdminState(request);
    if (adminState.error) {
      return adminState.error;
    }
    queryClient = adminState.supabase;
  }

  let query = queryClient
    .from("news_cards")
    .select(
      "id, headline, summary, why_it_matters_student, why_it_matters_business, category, status, created_by, created_at, published_at, image_url"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (!includeDrafts) {
    query = query.eq("status", "published");
  }

  if (isValidNewsCategory(category)) {
    query = applyCategoryFilter(query, category);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingNewsCardsSetup(error)) {
      return errorResponse(
        "The news_cards table is missing in Supabase. Run the SQL setup shown on the admin page.",
        500,
        { needsSetup: true }
      );
    }

    return errorResponse(error.message || "Unable to load news cards.");
  }

  return new Response(
    JSON.stringify((data || []).map((row) => normalizeNewsCard(row))),
    {
      status: 200,
      headers: jsonHeaders,
    }
  );
}

export async function POST(request) {
  const adminState = await getAdminState(request);

  if (adminState.error) {
    return adminState.error;
  }

  try {
    const body = await request.json();
    const headline = body?.headline?.trim();
    const summary = body?.summary?.trim();
    const whyItMattersStudent = body?.why_it_matters_student?.trim();
    const whyItMattersBusiness = body?.why_it_matters_business?.trim();
    const category = body?.category?.trim();
    const status = body?.status?.trim();
    const imageUrl = body?.image_url?.trim() || null;

    if (!headline || !summary || !whyItMattersStudent || !whyItMattersBusiness) {
      return errorResponse("Please fill in every field before saving.", 400);
    }

    if (!isValidNewsCategory(category)) {
      return errorResponse("Please choose Student, Business, Explore, or Both for category.", 400);
    }

    if (!isValidNewsStatus(status)) {
      return errorResponse("Status must be Draft or Published.", 400);
    }

    if (headline.length > 180) {
      return errorResponse("Headline should stay under 180 characters.", 400);
    }

    if (summary.length > 400) {
      return errorResponse("Summary should stay under 400 characters.", 400);
    }

    const payload = {
      headline,
      summary,
      why_it_matters_student: whyItMattersStudent,
      why_it_matters_business: whyItMattersBusiness,
      category,
      status,
      image_url: imageUrl,
      created_by: adminState.user.id,
      published_at: status === "published" ? new Date().toISOString() : null,
    };

    const { data, error } = await adminState.supabase
      .from("news_cards")
      .insert(payload)
      .select(
        "id, headline, summary, why_it_matters_student, why_it_matters_business, category, status, created_by, created_at, published_at, image_url"
      )
      .single();

    if (error) {
      if (isMissingNewsCardsSetup(error)) {
        return errorResponse(
          "The news_cards table is missing in Supabase. Run the SQL setup shown on the admin page.",
          500,
          { needsSetup: true }
        );
      }

      return errorResponse(error.message || "Unable to save this news card.");
    }

    if (status === "published" && supabaseServiceRoleKey && vapidPublicKey && vapidPrivateKey) {
      try {
        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });

        const { data: subscriptions, error: subsError } = await adminClient
          .from("push_subscriptions")
          .select("subscription");

        if (!subsError && Array.isArray(subscriptions) && subscriptions.length > 0) {
          const notificationPayload = {
            title: "New briefing published",
            body: headline,
            url: `/cards/${data.id}`,
          };

          await Promise.all(
            subscriptions.map((row) =>
              webpush.sendNotification(row.subscription, JSON.stringify(notificationPayload)).catch(() => null)
            )
          );
        }
      } catch {
        // Silently ignore push failures; card creation itself should still succeed.
      }
    }

    return new Response(JSON.stringify(normalizeNewsCard(data)), {
      status: 201,
      headers: jsonHeaders,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unexpected error while saving the news card."
    );
  }
}