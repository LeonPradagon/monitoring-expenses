require('dotenv').config({ path: '.env' });
const axios = require('axios');

const systemPrompt = `
Kamu adalah asisten keuangan personal bernama Nanalys untuk aplikasi MoneyTrack Pro.
`;

async function test() {
  try {
    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "halo" }
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 4096,
        stream: false
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("SUCCESS:", response.data);
  } catch (error) {
    console.log("ERROR:", error.response?.data || error.message);
  }
}
test();
