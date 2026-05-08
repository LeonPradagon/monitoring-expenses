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
            content: `Anda adalah Nanalys, asisten keuangan pribadi yang sangat cerdas dan teliti.
            Tugas Anda adalah mengekstrak data dari pesan user ke dalam format JSON yang tepat.

            KONTEKS SAAT INI:
            - Keluarga: ${context}
            - Kategori Tersedia: Makan, Transport, Belanja, Tagihan, Hiburan, Lainnya.

            ATURAN RESPON:
            1. Jika user mencatat pengeluaran, balas HANYA dengan JSON: {"type": "expense", "amount": 20000, "category": "Makan", "note": "bakso"}
            2. Jika user update saldo total, balas HANYA dengan JSON: {"type": "update_balance", "amount": 1000000}
            3. Jika user update budget bulanan, balas HANYA dengan JSON: {"type": "update_budget", "amount": 5000000}
            4. Jika user bertanya atau mengobrol biasa, balaslah dengan ramah dan informatif sebagai asisten keuangan.
            5. JANGAN memberikan teks penjelasan jika Anda mengirimkan JSON.
            6. Pastikan angka (amount) adalah integer murni tanpa titik/koma.
            
            CONTOH:
            User: "beli kopi 15000"
            Respon: {"type": "expense", "amount": 15000, "category": "Makan", "note": "kopi"}
            
            User: "set saldo jadi 2 juta"
            Respon: {"type": "update_balance", "amount": 2000000}`
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
      { "Keterangan": "Sisa Budget", "Nilai": member.families.total_budget },
      { "Keterangan": "Total Pengeluaran (Data Terlampir)", "Nilai": totalSpend }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), "Summary");
    
    const transactionSheetData = transactions.map(t => ({
      "Tanggal": new Date(t.date).toLocaleString('id-ID'),
      "Kategori": t.category?.name || "Lainnya",
      "Nominal": Number(t.amount),
      "Catatan": t.note || "-"
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionSheetData), "Transactions");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    await ctx.replyWithDocument(new InputFile(excelBuffer, `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`));
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

        // 2. Update Family Balance & Budget (Deduct Both)
        const newBalance = Number(member.families.total_balance) - aiParsed.amount;
        const newBudget = Number(member.families.total_budget) - aiParsed.amount;
        
        await supabase.from("families").update({ 
          total_balance: newBalance,
          total_budget: newBudget
        }).eq("id", member.family_id);

        // 3. Check Budget Status for Alert
        // We use a separate query to get total spent if we want to show original vs spent, 
        // but here we just use the newBudget value to alert if it's low.
        let alertMsg = "";
        if (newBudget <= 0) {
          alertMsg = `\n\n🚨 *WARNING: BUDGET HABIS!* 🚨\nBudget Anda sudah terpakai semua atau terlampaui!`;
        } else if (newBudget < 100000) { // Example threshold
          alertMsg = `\n\n⚠️ *PERINGATAN BUDGET* ⚠️\nSisa budget Anda tinggal sedikit: *${formatter.format(newBudget)}*`;
        }

        return ctx.reply(`✅ *Tercatat!*\n💸 *${formatter.format(aiParsed.amount)}* — ${category.icon} ${category.name}\n💰 Sisa Saldo: *${formatter.format(newBalance)}*\n📊 Sisa Budget: *${formatter.format(newBudget)}*${alertMsg}`, { parse_mode: "Markdown" });
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
