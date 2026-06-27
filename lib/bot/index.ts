import { Bot } from "grammy";
import { setupHandlers } from "@/lib/bot/handlers";

// Use environment variables
const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_SECRET_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_TOKEN is not defined in environment variables");
}

export const bot = new Bot(token);

bot.catch(async (err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`, err.error);
  // Coba kirim pesan error ke user agar mereka tahu sistem sedang gangguan
  await ctx.reply("❌ Maaf, sistem bot mengalami gangguan internal (Vercel/Database Error). Silakan hubungi admin.").catch(() => {});
});

// Setup handlers
setupHandlers(bot);
