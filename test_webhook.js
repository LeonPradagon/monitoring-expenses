require('dotenv').config({ path: '.env' });
const axios = require('axios');

async function testWebhook() {
  const telegramUpdate = {
    update_id: 123456,
    message: {
      message_id: 1,
      from: { id: 111, is_bot: false, first_name: "TestUser" },
      chat: { id: 111, type: "private" },
      date: Math.floor(Date.now() / 1000),
      text: "saya ingin update saldo tabungan saya saat ini 42.869.000"
    }
  };

  try {
    const res = await axios.post('http://localhost:3000/api/bot/webhook', telegramUpdate, {
      headers: {
        'x-telegram-bot-api-secret-token': process.env.TELEGRAM_SECRET_TOKEN || ''
      }
    });
    console.log("WEBHOOK RESPONSE:", res.status, res.data);
  } catch (err) {
    console.log("WEBHOOK ERROR:", err.response?.status, err.response?.data || err.message);
  }
}

testWebhook();
