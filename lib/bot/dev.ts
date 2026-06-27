import { bot } from "@/lib/bot";
import * as dotenv from 'dotenv';
dotenv.config();

console.log("Menjalankan Telegram Bot Nanalys dalam mode Development (Long Polling)...");

bot.start({
  onStart: (botInfo) => {
    console.log(`🤖 Bot @${botInfo.username} berhasil terhubung!`);
    console.log(`Silakan coba chat bot di Telegram.`);
  },
});
