const axios = require('axios');
require('dotenv').config();

async function test() {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    console.log(response.data.models.map(m => m.name));
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
