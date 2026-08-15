const API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=" + API_KEY;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: "You are an editor for a geopolitics app. In exactly one sentence, why does Japan investing in India matter to Indian tech students?" 
          }]
        }]
      })
    });

    const data = await response.json();
    
    // Drill down into the JSON object to extract just the text string
    const generatedText = data.candidates[0].content.parts[0].text;
    
    console.log("\n--- SATYA BRIEFING ---");
    console.log(generatedText);
    console.log("----------------------\n");

  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

testGemini();