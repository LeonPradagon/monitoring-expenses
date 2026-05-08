// @ts-nocheck
import { Bot, webhookCallback, InputFile, Context } from "https://esm.sh/grammy@1.21.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const bot = new Bot(TELEGRAM_TOKEN);

async function askAI(prompt: string, context: string) {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://moneytrack-pro.vercel.app",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        messages: [
          {
            role: "system",
            content: `Anda adalah Nanalys, asisten keuangan pribadi. 
            KONTEKS: ${context}
            1. Catat pengeluaran -> JSON: {"type": "expense", "amount": 20000, "category": "Makan", "note": "bakso"}
            2. Update saldo -> JSON: {"type": "update_balance", "amount": 1000000}
            3. Update budget -> JSON: {"type": "update_budget", "amount": 5000000}
            4. Chatting -> Balas ramah.
            Categories: Makan, Transport, Belanja, Tagihan, Hiburan, Lainnya.`
          },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

bot.command("start", async (ctx: Context) => {
  const payload = ctx.match;
  if (payload) {
    const { data: member, error } = await supabase.from("family_members").update({ telegram_id: ctx.from?.id, telegram_link_code: null }).eq("telegram_link_code", payload).select().single();
    if (error || !member) return ctx.reply("❌ Kode aktivasi tidak valid.");
    return ctx.reply(`✅ *Terhubung!*\n\nCatat pengeluaran (20k makan) atau cek budget Anda kapan saja!`, { parse_mode: "Markdown" });
  }
  await ctx.reply("👋 Halo! Saya Nanalys. Saya siap menjaga keuangan Anda.");
});

bot.command("export", async (ctx: Context) => {
  try {
    const telegramId = ctx.from?.id;
    const { data: member } = await supabase.from("family_members").select("*, families(*)").eq("telegram_id", telegramId).single();
    if (!member) return ctx.reply("❌ Akun belum terdaftar.");

    const { data: transactions } = await supabase.from("transactions").select("*, category:categories(name)").eq("family_id", member.family_id).order('date', { ascending: false });
    if (!transactions || transactions.length === 0) return ctx.reply("📭 Belum ada data.");

    const totalSpend = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const workbook = XLSX.utils.book_new();
    
    const summaryData = [
      { "Keterangan": "Saldo Saat Ini", "Nilai": member.families.total_balance },
      { "Keterangan": "Budget Bulanan", "Nilai": member.families.total_budget },
      { "Keterangan": "Total Pengeluaran", "Nilai": totalSpend },
      { "Keterangan": "Sisa Budget", "Nilai": Number(member.families.total_budget) - totalSpend }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactions.map(t => ({ "Tanggal": t.date, "Kategori": t.category?.name, "Nominal": t.amount, "Catatan": t.note }))), "Transactions");

    const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    await ctx.replyWithDocument(new InputFile(excelBuffer, `Laporan_Keuangan.xlsx`));
  } catch (err) { await ctx.reply("❌ Gagal membuat laporan."); }
});

bot.on("message:text", async (ctx: Context) => {
  const text = ctx.message?.text || "";
  const telegramId = ctx.from?.id;
  if (text.startsWith('/')) return;

  const { data: member, error: memberError } = await supabase.from("family_members").select("*, families(*)").eq("telegram_id", telegramId).single();
  if (memberError || !member) return ctx.reply("❌ Akun belum terdaftar.");

  await ctx.replyWithChatAction("typing");
  const aiResponse = await askAI(text, `User di keluarga "${member.families.name}". Saldo: ${member.families.total_balance}. Budget: ${member.families.total_budget}.`);
  
  if (!aiResponse) return ctx.reply("❓ Maaf, ada gangguan teknis.");

  const jsonMatch = aiResponse.match(/\{.*\}/s);
  if (jsonMatch) {
    try {
      const aiParsed = JSON.parse(jsonMatch[0]);
      const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });

      if (aiParsed.type === "update_balance") {
        await supabase.from("families").update({ total_balance: aiParsed.amount }).eq("id", member.family_id);
        return ctx.reply(`💰 *Saldo Diperbarui!*\nTotal: *${formatter.format(aiParsed.amount)}*`, { parse_mode: "Markdown" });
      }

      if (aiParsed.type === "update_budget") {
        await supabase.from("families").update({ total_budget: aiParsed.amount }).eq("id", member.family_id);
        return ctx.reply(`📊 *Budget Diperbarui!*\nBulan ini: *${formatter.format(aiParsed.amount)}*`, { parse_mode: "Markdown" });
      }

      if (aiParsed.type === "expense") {
        const { data: category } = await supabase.from("categories").select("*").eq("family_id", member.family_id).ilike("name", `%${aiParsed.category}%`).limit(1).single();
        if (!category) return ctx.reply(`❌ Kategori "${aiParsed.category}" tidak ditemukan.`);

        // 1. Insert Transaction
        await supabase.from("transactions").insert({
          family_id: member.family_id, category_id: category.id, amount: aiParsed.amount, note: aiParsed.note || "", source: "telegram-ai", created_by: member.user_id, date: new Date().toISOString()
        });

        // 2. Update Family Balance (Deduct)
        const newBalance = Number(member.families.total_balance) - aiParsed.amount;
        await supabase.from("families").update({ total_balance: newBalance }).eq("id", member.family_id);

        // 3. Check Budget Status
        const { data: allTrans } = await supabase.from("transactions").select("amount").eq("family_id", member.family_id);
        const totalSpent = allTrans.reduce((sum, t) => sum + Number(t.amount), 0);
        const budgetLimit = Number(member.families.total_budget);
        
        let alertMsg = "";
        if (totalSpent >= budgetLimit) {
          alertMsg = `\n\n🚨 *WARNING: BUDGET TERLAMPAUI!* 🚨\nTotal pengeluaran (*${formatter.format(totalSpent)}*) sudah melebihi budget bulanan (*${formatter.format(budgetLimit)}*). Segera stop pengeluaran!`;
        } else if (totalSpent >= budgetLimit * 0.8) {
          alertMsg = `\n\n⚠️ *PERINGATAN BUDGET* ⚠️\nPengeluaran Anda sudah mencapai 80% dari budget bulanan. Sisa budget: *${formatter.format(budgetLimit - totalSpent)}*`;
        }

        return ctx.reply(`✅ *Tercatat!*\n💸 *${formatter.format(aiParsed.amount)}* — ${category.icon} ${category.name}\n💰 Sisa Saldo: *${formatter.format(newBalance)}*${alertMsg}`, { parse_mode: "Markdown" });
      }
    } catch (e) { }
  }
  return ctx.reply(`🤖 ${aiResponse}`);
});

const handleUpdate = webhookCallback(bot, "std/http");
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== Deno.env.get("FUNCTION_SECRET")) return new Response("unauthorized", { status: 403 });
  return await handleUpdate(req);
});
