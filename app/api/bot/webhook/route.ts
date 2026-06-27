import { bot } from "@/lib/bot";

export const maxDuration = 60; // Prevent Vercel from killing the function early

let isInitialized = false;

export const POST = async (req: Request) => {
  try {
    if (!isInitialized) {
      await bot.init();
      isInitialized = true;
    }
    
    const update = await req.json();
    await bot.handleUpdate(update);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error("WEBHOOK CRITICAL ERROR:", err);
    // Selalu return 200 ke Telegram meskipun ada error internal bot,
    // agar Telegram tidak stuck melakukan retry berulang kali untuk pesan yang sama.
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
};

