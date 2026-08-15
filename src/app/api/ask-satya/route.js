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
      return errorResponse("Please sign in again.", 401);
    }

    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Supabase environment variables are missing.");
    }

    const client = createClient(supabaseUrl, supabaseKey);
    const token = authorization.slice(7).trim();
    const {
      data: { user },
    } = await client.auth.getUser(token);

    if (!user) {
      return errorResponse("Your session expired. Please log in again.", 401);
    }

    const body = await request.json();
    const question = body?.question?.trim();
    const cardContext = body?.cardContext?.trim() || "";

    if (!question) {
      return errorResponse("Please enter a question.", 400);
    }

    if (question.length > 300) {
      return errorResponse("Please keep questions under 300 characters.", 400);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return errorResponse("AI answering is not configured yet.");
    }

    const systemInstruction = `You are a careful, neutral assistant answering one specific question from a reader of a geopolitics news card, in casual Hinglish tone when natural, otherwise plain English.

Rules:
- Base your answer primarily on the provided story context. If the question goes beyond what the story covers, say so plainly rather than inventing specifics.
- Never present speculation as fact, especially about personal safety, immigration status, visa risk, or legal standing. If a question implies personal risk (e.g. "am I under threat"), give balanced, general context and clearly say this is not professional legal, immigration, or safety advice, and that official sources or a qualified professional should be consulted for anything consequential.
- Keep answers short: 3-5 sentences maximum.
- Do not make definitive predictions about future political events.
- If you are uncertain, say so directly instead of guessing confidently.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              parts: [
                {
                  text: `Story context:\n${cardContext}\n\nReader's question:\n${question}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const bodyText = await response.text();
      return errorResponse(`AI request failed: ${response.status} ${bodyText}`);
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      return errorResponse("The AI didn't return an answer. Please try rephrasing.");
    }

    return new Response(JSON.stringify({ answer: answer.trim() }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error.");
  }
}