const axios = require('axios');
require('dotenv').config();

async function test() {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: `Return JSON only: {"hello": "world"}` }
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
    let content = response.data.candidates[0].content.parts[0].text;
    console.log("Raw output:");
    console.log(content);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
