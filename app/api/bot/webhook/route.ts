import { webhookCallback } from "grammy";
import { bot } from "@/lib/bot";

export const maxDuration = 60; // Prevent Vercel from killing the function early

const handler = webhookCallback(bot, "std/http");

export const POST = async (req: Request) => {
  try {
    return await handler(req);
  } catch (err: any) {
    console.error("WEBHOOK CRITICAL ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
