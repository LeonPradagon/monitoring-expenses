import { Bot, webhookCallback } from "grammy";
import { parseNaturalLanguage } from "@/lib/ai";
import { createClient } from "@supabase/supabase-js";

const bot = new Bot(process.env.TELEGRAM_SECRET_TOKEN || "");

// Admin supabase client for webhook (bypasses RLS)
// This REQUIRES SUPABASE_SERVICE_ROLE_KEY in .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; 
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

bot.command("start", async (ctx) => {
  const userId = ctx.match;
  if (!userId) {
    return ctx.reply("Silakan hubungkan akun melalui Web Dashboard MoneyTrack Pro terlebih dahulu.");
  }

  try {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchErr) throw fetchErr;
    
    // Clear any existing user that might have this chat ID to avoid unique constraint violations
    await supabaseAdmin.from('user_settings').update({ telegram_chat_id: null }).eq('telegram_chat_id', ctx.chat.id.toString());
    
    if (existing) {
      const { error: updateErr } = await supabaseAdmin.from('user_settings').update({ telegram_chat_id: ctx.chat.id.toString() }).eq('user_id', userId);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseAdmin.from('user_settings').insert({ user_id: userId, telegram_chat_id: ctx.chat.id.toString() });
      if (insertErr) throw insertErr;
    }

    await ctx.reply("✅ Akun Telegram Anda berhasil dihubungkan ke MoneyTrack Pro!");
  } catch (error: any) {
    console.error("Link error:", error);
    await ctx.reply("❌ Gagal menghubungkan akun. Error: " + (error.message || "Unknown error"));
  }
});

bot.command("saldo", async (ctx) => {
  const { data: userSettings } = await supabaseAdmin
    .from('user_settings')
    .select('user_id')
    .eq('telegram_chat_id', ctx.chat.id.toString())
    .maybeSingle();

  const userId = userSettings?.user_id;
  if (!userId) return ctx.reply("Akun Anda belum terhubung. Gunakan Web Dashboard.");

  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('name, balance')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!accounts || accounts.length === 0) {
    return ctx.reply("Anda belum memiliki akun keuangan yang aktif.");
  }

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const balances = accounts.map((a: any) => `- ${a.name}: ${formatter.format(a.balance || 0)}`).join("\n");
  
  await ctx.reply(`💰 *Saldo Anda saat ini:*\n\n${balances}`, { parse_mode: "Markdown" });
});

bot.on("message:text", async (ctx) => {
  const { data: userSettings } = await supabaseAdmin
    .from('user_settings')
    .select('user_id')
    .eq('telegram_chat_id', ctx.chat.id.toString())
    .maybeSingle();

  const userId = userSettings?.user_id;
  if (!userId) return ctx.reply("Akun belum terhubung. Klik connect dari Web Dashboard.");

  await ctx.replyWithChatAction("typing");

  const [
    { data: accounts },
    { data: categories }
  ] = await Promise.all([
    supabaseAdmin.from('accounts').select('id, name, type').eq('user_id', userId).eq('is_active', true),
    supabaseAdmin.from('categories').select('id, name, type').eq('user_id', userId)
  ]);

  const context = { accounts: accounts || [], categories: categories || [] };
  const parsed = await parseNaturalLanguage(ctx.message.text, context);

  if (!parsed || parsed.intent !== "create_transaction") {
    return ctx.reply("Maaf, saya tidak mengerti transaksi yang Anda maksud. Coba sebutkan nominal dan keterangannya secara jelas. (Contoh: Beli kopi 25rb pakai gopay)");
  }

  try {
    const accountId = parsed.account_id || context.accounts[0]?.id;
    if (!accountId) throw new Error("No account found");

    // Start a simple transaction logic via RPC or sequential calls
    // 1. Get current balance
    const { data: accountData } = await supabaseAdmin.from('accounts').select('balance').eq('id', accountId).single();
    let currentBalance = parseFloat(accountData?.balance || 0);

    // 2. Calculate new balance
    const amount = parseFloat(parsed.amount);
    if (parsed.type === 'expense') currentBalance -= amount;
    else if (parsed.type === 'income') currentBalance += amount;

    // 3. Update account balance
    await supabaseAdmin.from('accounts').update({ balance: currentBalance }).eq('id', accountId);

    // 4. Insert transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      account_id: accountId,
      category_id: parsed.category_id || null,
      type: parsed.type,
      amount: amount,
      description: parsed.description,
      date: new Date().toISOString().split('T')[0],
      source: 'telegram',
      ai_categorized: true
    });
    
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
    const amountStr = formatter.format(amount);
    const typeStr = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    const accountName = context.accounts.find((a: any) => a.id === accountId)?.name || 'Default';
    
    await ctx.reply(`✅ *Transaksi berhasil dicatat*\n\n📌 ${parsed.description}\n💸 ${amountStr} (${typeStr})\n🏦 ${accountName}`, { parse_mode: "Markdown" });
    
  } catch (error) {
    console.error(error);
    await ctx.reply("❌ Gagal mencatat transaksi. Terjadi kesalahan pada sistem.");
  }
});

export const POST = webhookCallback(bot, "std/http");
