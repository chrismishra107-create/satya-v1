import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req) {
  try {
    const { id, status } = await req.json();
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Bypass RLS and update the status directly
    const { error } = await supabase
      .from("pending_drafts")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: `Draft marked as ${status}` });
  } catch (err) {
    console.error("Update Draft Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}