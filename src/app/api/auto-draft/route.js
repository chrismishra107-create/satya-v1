import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials in environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch existing headlines to prevent duplicates & re-evaluations
    const [{ data: existingPending }, { data: existingLive }] = await Promise.all([
      supabase.from("pending_drafts").select("headline"),
      supabase.from("news_cards").select("headline")
    ]);

    const existingHeadlines = new Set([
      ...(existingPending || []).map((d) => d.headline.toLowerCase().trim()),
      ...(existingLive || []).map((c) => c.headline.toLowerCase().trim())
    ]);

    // 2. Fetch fresh action-oriented stories
    const query = encodeURIComponent(
      `India AND (signs OR launches OR approves OR bans OR introduces OR deployed OR partnership) NOT (slams OR condemns OR remarks OR rahul OR modi OR bjp OR congress OR cricket OR bollywood OR actor)`
    );
    const gnewsUrl = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=10&sortBy=publishedAt&apikey=${GNEWS_API_KEY}`;

    console.log("Fetching fresh intelligence from GNews...");
    const gnewsRes = await fetch(gnewsUrl);
    const gnewsData = await gnewsRes.json();

    if (!gnewsData.articles || gnewsData.articles.length === 0) {
      return NextResponse.json({ message: "No fresh articles found." });
    }

    const processedDrafts = [];
    const skippedArticles = [];
    const processedTopics = new Set();

    for (const article of gnewsData.articles) {
      const cleanTitle = (article.title || "").toLowerCase().trim();

      // DEDUPLICATION: Skip if identical title already in DB
      if (existingHeadlines.has(cleanTitle)) {
        console.log(`⏩ SKIPPED (Already in DB): "${article.title}"`);
        skippedArticles.push(article.title);
        continue;
      }

      // TOPIC DEDUPLICATION: Avoid processing multiple wire articles about the exact same story
      const titleKeywords = cleanTitle.split(" ").filter((w) => w.length > 4).slice(0, 4).join(" ");
      if (processedTopics.has(titleKeywords)) {
        console.log(`⏩ SKIPPED (Duplicate Topic in Batch): "${article.title}"`);
        skippedArticles.push(article.title);
        continue;
      }
      processedTopics.add(titleKeywords);

      console.log(`Evaluating: "${article.title}"...`);

      const prompt = `You are a Chief Geopolitical Intelligence Analyst for 'Satya'. Output MUST be in Hinglish.

STRICT FILTER RULES:
1. APPROVE ONLY IF: Real structural, systemic, military, trade, infrastructure, or policy change with concrete outcome.
2. REJECT IF: Political statements, reactions, award ceremonies, local crime, corporate marketing, or opinions with no binding change.

STYLE & SUBSTANCE RULES (NO GENERIC AI FLUFF):
- Do not output generic statements like 'this will improve economy'. State EXACT numbers, trade routes, weapon specs, treaty clauses, or strategic choke points.
- Show concrete consequences (e.g. 'reduces transit time via Suez by 40%', 'bypasses Russian dependency on Western SWIFT').
- Hinglish must be natural, authoritative, and precise.

FORMATTING:
- Valid JSON ONLY.
- Use single quotes (') for quotes/names inside text. NEVER unescaped double quotes.
- No raw newlines.

JSON STRUCTURE:
{
  "is_approved": true,
  "rejection_reason": "",
  "headline": "Punchy, authoritative headline in Hinglish",
  "summary": "3-sentence dense executive summary with exact facts and figures in Hinglish.",
  "who": "Exact entities, state ministries, military branches, and corporations involved.",
  "what": "The specific contractual, legislative, or military action taken.",
  "when_time": "Exact timeline, rollout dates, and procurement milestones.",
  "where_location": "Strategic geography, border sectors, sea lanes, or domestic production hubs.",
  "why_1": "Immediate trigger and operational necessity (with facts).",
  "why_2": "Why the timing matters right now in global/regional context.",
  "why_3": "Strategic gap being addressed (e.g. import substitution, deterrence).",
  "why_4": "Impact on domestic industry, student R&D, tech transfer, or careers.",
  "why_5": "Grand strategy position (Quad, BRICS, Indo-Pacific leverage).",
  "historical_context": "Past conflicts, prior agreements, or policy shifts that led to this.",
  "structural_score": 85
}

News Article:
Title: ${article.title}
Description: ${article.description}
Content: ${article.content}`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );

      const geminiData = await geminiRes.json();

      try {
        if (geminiData.error) {
          console.log(`⚠️ Gemini Error: ${geminiData.error.message}`);
          continue;
        }

        const candidate = geminiData.candidates?.[0];
        if (!candidate || candidate.finishReason === "SAFETY") {
          console.log(`⚠️ Blocked/Empty for: "${article.title}"`);
          continue;
        }

        let generatedText = candidate.content?.parts?.[0]?.text;
        if (!generatedText) continue;

        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");

        const cleanJsonString = jsonMatch[0].replace(/[\r\n]+/g, " ");
        const aiData = JSON.parse(cleanJsonString);

        if (aiData.is_approved) {
          const draftRecord = {
            headline: aiData.headline || article.title,
            summary: aiData.summary || article.description,
            image_url: article.image || "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
            who: aiData.who || "",
            what: aiData.what || "",
            when_time: aiData.when_time || "",
            where_location: aiData.where_location || "",
            why_1: aiData.why_1 || "",
            why_2: aiData.why_2 || "",
            why_3: aiData.why_3 || "",
            why_4: aiData.why_4 || "",
            why_5: aiData.why_5 || "",
            historical_context: aiData.historical_context || "",
            structural_score: Number(aiData.structural_score) || 80,
            status: "pending"
          };

          const { error: dbError } = await supabase.from("pending_drafts").insert([draftRecord]);
          if (dbError) throw dbError;

          existingHeadlines.add(draftRecord.headline.toLowerCase().trim());
          processedDrafts.push(draftRecord.headline);
          console.log(`✅ QUEUED: ${draftRecord.headline}`);
        } else {
          console.log(`❌ REJECTED: ${article.title}`);
        }
      } catch (parseErr) {
        console.error(`🚨 Error parsing "${article.title}":`, parseErr.message);
      }

      // Safe rate-limiting pause
      await delay(4200);
    }

    return NextResponse.json({
      status: "Pipeline executed",
      drafts_queued: processedDrafts.length,
      skipped_count: skippedArticles.length
    });
  } catch (err) {
    console.error("Auto-Draft Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}