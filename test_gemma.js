const axios = require('axios');
require('dotenv').config();

async function test() {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-2-27b-it:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: `Return JSON only: {"hello": "world"}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    console.log(response.data.candidates[0].content.parts[0].text);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
