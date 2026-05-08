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
    return ctx.reply(`✅ *Terhubung!*\n\nAnda bisa mencatat pengeluaran atau update saldo. Contoh: \`20k makan\` atau \`Saldo saya 1 juta\``, { parse_mode: "Markdown" });
  }
  await ctx.reply("👋 Selamat datang di MoneyTrack Pro!");
});

// PREMIUM FULL EXCEL EXPORT
bot.command("export", async (ctx: Context) => {
  try {
    const telegramId = ctx.from?.id;
    const { data: member } = await supabase.from("family_members").select("*, families(*)").eq("telegram_id", telegramId).single();
    if (!member) return ctx.reply("❌ Akun belum terdaftar.");

    await ctx.reply("⏳ Menghasilkan laporan keuangan lengkap...");

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*, category:categories(name)")
      .eq("family_id", member.family_id)
      .order('date', { ascending: false });

    if (!transactions || transactions.length === 0) return ctx.reply("📭 Belum ada data transaksi.");

    const totalSpend = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });

    // Sheet 1: Financial Summary
    const summaryData = [
      { "Keterangan": "Nama Keluarga", "Nilai": member.families.name },
      { "Keterangan": "Total Saldo Saat Ini", "Nilai": member.families.total_balance },
      { "Keterangan": "Budget Bulanan", "Nilai": member.families.total_budget },
      { "Keterangan": "Total Pengeluaran", "Nilai": totalSpend },
      { "Keterangan": "Sisa Budget", "Nilai": Number(member.families.total_budget) - totalSpend },
      { "Keterangan": "Jumlah Transaksi", "Nilai": transactions.length },
      { "Keterangan": "Tanggal Laporan", "Nilai": new Date().toLocaleString('id-ID') }
    ];

    // Sheet 2: Transactions
    const transactionRows = transactions.map(t => ({
      "Tanggal": new Date(t.date).toLocaleString('id-ID'),
      "Kategori": t.category?.name || "Lainnya",
      "Nominal": Number(t.amount),
      "Catatan": t.note || "-",
      "Sumber": t.source
    }));

    const workbook = XLSX.utils.book_new();
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Finansial");

    const transSheet = XLSX.utils.json_to_sheet(transactionRows);
    XLSX.utils.book_append_sheet(workbook, transSheet, "Riwayat Transaksi");

    const excelBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    await ctx.reply(`📊 *Laporan Keuangan Selesai*\n\n💰 Saldo: *${formatter.format(member.families.total_balance)}*\n📊 Budget: *${formatter.format(member.families.total_budget)}*\n💸 Pengeluaran: *${formatter.format(totalSpend)}*\n\n_File Excel berisi detail lengkap sudah siap!_`, { parse_mode: "Markdown" });
    
    await ctx.replyWithDocument(new InputFile(excelBuffer, `MoneyTrack_FullReport_${new Date().toISOString().split('T')[0]}.xlsx`));
  } catch (err) {
    console.error("Export Error:", err);
    await ctx.reply("❌ Gagal membuat laporan Excel.");
  }
});

bot.on("message:text", async (ctx: Context) => {
  const text = ctx.message?.text || "";
  const telegramId = ctx.from?.id;
  if (text.startsWith('/')) return;

  const { data: member, error: memberError } = await supabase.from("family_members").select("*, families(*)").eq("telegram_id", telegramId).single();
  if (memberError || !member) return ctx.reply("❌ Akun belum terdaftar.");

  await ctx.replyWithChatAction("typing");
  const aiResponse = await askAI(text, `User di keluarga "${member.families.name}". Saldo: ${member.families.total_balance}. Budget: ${member.families.total_budget}.`);
  
  if (!aiResponse) return ctx.reply("❓ Maaf, ada gangguan teknis. Coba lagi nanti.");

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

        await supabase.from("transactions").insert({
          family_id: member.family_id,
          category_id: category.id,
          amount: aiParsed.amount,
          note: aiParsed.note || "",
          source: "telegram-ai",
          created_by: member.user_id,
          date: new Date().toISOString()
        });

        return ctx.reply(`✅ *Tercatat!*\n💸 *${formatter.format(aiParsed.amount)}* — ${category.icon} ${category.name}\n📝 ${aiParsed.note || "-"}`, { parse_mode: "Markdown" });
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
