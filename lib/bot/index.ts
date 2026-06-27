import { Bot } from "grammy";
import { setupHandlers } from "@/lib/bot/handlers";

// Use environment variables
const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_SECRET_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_TOKEN is not defined in environment variables");
}

export const bot = new Bot(token);

// Setup handlers
setupHandlers(bot);
