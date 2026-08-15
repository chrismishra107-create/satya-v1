const Parser = require('rss-parser');
const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
});

// Your API Key
const API_KEY = process.env.GEMINI_API_KEY;

async function generateSatyaCard(newsText) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + API_KEY;
  
  // The Elite Geopolitical Analyst Prompt
  const prompt = `You are an elite geopolitical intelligence analyst. Your job is to process traditional news articles and convert them into high-signal, zero-fluff intelligence briefings exclusively for students tracking global policy, visa shifts, and economic futures.

You must return a raw JSON object containing a deeply analytical breakdown of the provided news. DO NOT use generic boilerplate text. Anticipate the questions a smart, ambitious student would ask after reading the headline, and answer them with extreme precision and depth.

Your JSON output MUST adhere to this exact structure:
{
  "headline": "Write a sharp, high-impact headline (max 80 chars).",
  "summary": "Write a 3-sentence executive summary. No fluff. What happened and what is the immediate impact?",
  "category": "Must be exactly one of: 'student', 'business', 'explore', or 'both'.",
  "who": "List the specific political authorities, regulatory bodies, and institutional stakeholders involved.",
  "when": "Provide the exact timeline, dates, or legislative sessions.",
  "where": "Provide the specific geographical regions, borders, or jurisdictions.",
  "why_1": "Formulate a specific question about the immediate trigger (e.g., 'Why did this happen?'), followed by a detailed 2-3 sentence answer.",
  "why_2": "Formulate a specific question about the timing, followed by a detailed 2-3 sentence answer.",
  "why_3": "Formulate a specific question about the strategic necessity, followed by a detailed 2-3 sentence answer.",
  "why_4": "Formulate a specific question anticipating the reader's main doubt regarding their future, followed by a detailed answer.",
  "why_5": "Formulate a specific question about the grand strategy, followed by a detailed answer.",
  "historical_context": "Write a dense, 4-5 sentence paragraph detailing the historical precedents, past treaties, or long-standing systemic tensions that led to this exact moment. Provide deep context."
}

News to process: ${newsText}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // THIS IS THE MAGIC KEY: Forces Gemini to output pure, error-free JSON
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  const data = await response.json();
  
  if (!data.candidates) {
    console.error("Gemini Error:", data);
    return;
  }

  const generatedText = data.candidates[0].content.parts[0].text;
  
  try {
    // Converts the AI output into a real JavaScript object
    const satyaCardJSON = JSON.parse(generatedText);
    
    console.log("\n--- SATYA BRIEFING (JSON FORMAT) ---");
    console.log(JSON.stringify(satyaCardJSON, null, 2));
    console.log("------------------------------------\n");
    
    // NOTE: This JSON object is now perfectly formatted to send to Supabase!
    // Example: await supabase.from('news_cards').insert(satyaCardJSON);
    
    return satyaCardJSON;
  } catch (err) {
    console.error("Failed to parse JSON. Raw output was:", generatedText);
  }
}

async function runPipeline() {
  try {
    console.log("Fetching latest government data from PIB National Feed...");
    const feed = await parser.parseURL('https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3');
    
    if (!feed.items || feed.items.length === 0) {
      console.log("The feed connected, but no stories were found.");
      return;
    }

    // TIME CONSTRAINT: Look at the top story's timestamp
    const latestItem = feed.items[0];
    const pubDate = new Date(latestItem.isoDate || latestItem.pubDate);
    const now = new Date();
    
    // Calculate difference in hours
    const hoursDifference = (now - pubDate) / (1000 * 60 * 60);

    console.log(`Latest Story Found: "${latestItem.title}"`);
    console.log(`Published: ${pubDate.toLocaleString()} (${Math.round(hoursDifference)} hours ago)\n`);

    // STRICT CONSTRAINT: Only proceed if published within the last 24 hours
    if (hoursDifference > 24) {
      console.log("🛑 Skipped: The latest story is older than 24 hours. No new cards generated.");
      return;
    }

    console.log("⚡ Story is fresh! Generating Elite Satya Intelligence Dossier...\n");
    const latestStory = (latestItem.title || "No Title") + ": " + (latestItem.contentSnippet || "No content.");
    
    await generateSatyaCard(latestStory);

  } catch (error) {
    console.error("Failed to fetch RSS feed:", error.message);
  }
}

runPipeline();