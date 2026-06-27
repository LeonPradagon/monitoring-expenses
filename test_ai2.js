const axios = require('axios');
require('dotenv').config();

async function parseNaturalLanguage(text, context) {
  const systemPrompt = `Kamu adalah Nanalys, asisten keuangan yang cerdas. Tugasmu adalah mengubah pesan natural language menjadi format JSON... (truncated for test)
  Accounts: ${JSON.stringify(context.accounts)}
  Categories: ${JSON.stringify(context.categories)}`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nPESAN USER:\n${text}` }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    let content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Raw content:", content);
    
    let jsonStr = content.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    console.log("Extracted JSON:", jsonStr);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

parseNaturalLanguage("halo", {accounts: [], categories: []}).then(console.log);
