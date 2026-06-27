require('dotenv').config({ path: '.env' });
const { Bot } = require('grammy');

const token = process.env.TELEGRAM_SECRET_TOKEN;
if (!token) {
  console.error("No token found in .env");
  process.exit(1);
}

const bot = new Bot(token);

async function setCommands() {
  try {
    await bot.api.setMyCommands([
      { command: "start", description: "Mulai / Hubungkan Akun" },
      { command: "saldo", description: "Cek Saldo Akun" },
      { command: "bantuan", description: "Cara Penggunaan" }
    ]);
    console.log("Successfully set bot commands!");
  } catch (err) {
    console.error("Error setting commands:", err);
  }
}

setCommands();
