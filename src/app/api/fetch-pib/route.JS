import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GNEWS_API_KEY = process.env.GNEWS_API_KEY; 

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTopic = searchParams.get('topic') || 'Geopolitics';

    let searchQuery = rawTopic;
    if (searchQuery.split(' ').length === 1 && !searchQuery.toLowerCase().includes("india")) {
        searchQuery += " India";
    }

    // 1. Fetch from GNews
    let newsUrl = "https://gnews.io/api/v4/search?q=" + encodeURIComponent(searchQuery) + "&lang=en&max=5&apikey=" + GNEWS_API_KEY;
    let newsResponse = await fetch(newsUrl);
    let newsData = await newsResponse.json();

    if (!newsData.articles || newsData.articles.length === 0) {
      return NextResponse.json({ 
        error: `No recent news found for "${rawTopic}".` 
      }, { status: 404 });
    }

    const latestArticle = newsData.articles[0];
    const latestStory = latestArticle.title + ": " + latestArticle.description + " (Source: " + latestArticle.source.name + ")";
    
    // THE FIX: If GNews has no image, use a sleek placeholder so the form doesn't stay empty!
    const imageUrl = latestArticle.image || "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80";

    // 2. Your working gemini-3.5-flash model
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + GEMINI_API_KEY; 
    
    const prompt = `You are an elite intelligence editor for the student-focused app "Satya". Read this news and break it down into a structured intelligence dossier using the 5Ws and 1H framework in Hinglish.

    Return ONLY a valid JSON object with EXACTLY these keys:
    "headline": "A catchy headline hook in Hinglish, NO QUESTION MARKS",
    "summary": "A 60-second conversational summary under 350 characters in Hinglish",
    "who": "Who is involved? Key people, companies, or countries",
    "what": "What core event or policy change happened?",
    "when_where": "When did it happen and where?",
    "why": "Why is this happening? Underlying context",
    "how": "How does this directly impact students and their future/careers?",
    "category": "Must be strictly one of these two lowercase words: student or explore"

    News: ${latestStory}`;

    // 3. Fetch from Gemini
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    
    // 4. Ultimate Error Logger
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error("\n❌ GEMINI API REJECTED THE REQUEST ❌");
      console.error("REASON:", JSON.stringify(data, null, 2));
      console.error("---------------------------------------\n");
      return NextResponse.json({ error: "AI generation failed. Check your VS Code Terminal for the exact error." }, { status: 500 });
    }

    // 5. Parse and send data safely
    let generatedText = data.candidates[0].content.parts[0].text;
    
    // Safety check to remove any markdown blocks
    generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const aiData = JSON.parse(generatedText);

    aiData.image_url = imageUrl;
    return NextResponse.json(aiData);

  } catch (error) {
    console.error("AI Fetch Error:", error);
    return NextResponse.json({ error: "Failed to generate AI news dossier." }, { status: 500 });
  }
}