import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    // 1. Load credentials INSIDE the function so they never evaluate as null
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials in .env.local.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Grab ALL approved drafts
    const { data: approvedDrafts, error } = await supabase
      .from("pending_drafts")
      .select("*")
      .eq("status", "approved");

    if (error) throw error;

    if (!approvedDrafts || approvedDrafts.length === 0) {
      return NextResponse.json({ error: "No approved drafts to publish." }, { status: 400 });
    }

    // 3. Move approved drafts to the LIVE news_cards table
    for (let i = 0; i < approvedDrafts.length; i++) {
      const draft = approvedDrafts[i];
      const { id, status, ...liveCard } = draft;
      
      // Assign a rank and date
      liveCard.daily_rank = i + 1;
      liveCard.briefing_date = new Date().toISOString().split("T")[0];

      // Insert to Live Feed
      const { error: insertError } = await supabase.from("news_cards").insert([liveCard]);
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
      
      // Remove from Pending Queue
      const { error: deleteError } = await supabase.from("pending_drafts").delete().eq("id", draft.id);
      if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true, message: `Published ${approvedDrafts.length} briefings live!` });

  } catch (err) {
    console.error("Publishing Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}