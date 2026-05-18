// @ts-nocheck
import {
  Bot,
  webhookCallback,
  InputFile,
  Context,
} from "https://esm.sh/grammy@1.21.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const bot = new Bot(TELEGRAM_TOKEN);

async function askAI(prompt: string, financialContext: string) {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://moneytrack-pro.vercel.app",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-coder:free", // Atau "qwen/qwen-2.5-coder-32b-instruct:free" jika qwen3 belum rilis penuh
          messages: [
            {
              role: "system",
              content: `Anda adalah Nanalys, Senior Financial Accountant yang profesional, teliti, dan empatik.
            
            Tugas Anda:
            1. Membantu user mencatat pengeluaran, update saldo, atau budget.
            2. Memberikan saran keuangan yang cerdas dan manusiawi (Gunakan "Saya" dan "Anda").
            3. Berikan apresiasi jika user disiplin, atau peringatan halus jika budget menipis.
            
            KONTEKS FINANSIAL SAAT INI:
            ${financialContext}
            
            ATURAN RESPON:
            - Selalu balas dengan bahasa yang ramah, hangat, dan profesional sebagai akuntan pribadi.
            - DILARANG KERAS menggunakan bahasa teknis, koding, atau menyebutkan format JSON/sistem di dalam kalimat balasan Anda. Balas murni seperti percakapan manusia biasa.
            - Jika pesan mengandung intent transaksi, Anda WAJIB menyertakan blok JSON di akhir pesan Anda secara rahasia (sistem yang akan membacanya).
            - Intent transaksi: 
               1. "expense": mencatat pengeluaran (misal: "makan 20rb").
               2. "update_balance": update total uang yang ada (misal: "saldo saya sekarang 1jt").
               3. "update_budget": update batas pengeluaran bulan ini (misal: "budget bulan ini jadi 2jt").
               4. "get_summary": melihat laporan bulanan (misal: "lihat laporan bulan mei" atau "pengeluaran bulan ini").
            - JSON harus menggunakan format: {"type": "expense" | "update_balance" | "update_budget" | "get_summary", "amount": number, "category": "Nama Kategori", "note": "catatan", "advice": "saran singkat", "month": number, "year": number}
            - Untuk 'get_summary', isi field 'month' (1-12) dan 'year'.
            - Jika tidak ada transaksi (hanya ngobrol), jangan sertakan JSON.
            - Pastikan kategori sesuai dengan daftar yang tersedia. Jika tidak yakin, gunakan 'Lainnya'.
            
            CONTOH RESPON SUMMARY:
            "Tentu, saya siapkan laporan keuangan Anda untuk bulan Mei 2026. Tunggu sebentar ya...
            {"type": "get_summary", "month": 5, "year": 2026}"
            
            CONTOH RESPON TRANSAKSI:
            "Sudah saya catat ya! Makan bakso Rp25.000. Rasanya memang enak, tapi pastikan sisa budget makan cukup sampai akhir bulan ya.
            {"type": "expense", "amount": 25000, "category": "Makan", "note": "bakso", "advice": "Makan di luar sesekali boleh, tapi kontrol frekuensinya."}"`,
            },
            { role: "user", content: prompt },
          ],
        }),
      },
    );
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    return null;
  }
}

bot.command("start", async (ctx: Context) => {
  const payload = ctx.match;
  if (payload) {
    const { data: member, error } = await supabase
      .from("family_members")
      .update({ telegram_id: ctx.from?.id, telegram_link_code: null })
      .eq("telegram_link_code", payload)
      .select()
      .single();
    if (error || !member) return ctx.reply("❌ Kode aktivasi tidak valid.");
    return ctx.reply(
      `✅ *Terhubung!*\n\nCatat pengeluaran (20k makan) atau cek budget Anda kapan saja!`,
      { parse_mode: "Markdown" },
    );
  }
  await ctx.reply("👋 Halo! Saya Nanalys. Saya siap menjaga keuangan Anda.");
});

async function sendMonthlySummary(
  ctx: Context,
  member: any,
  month: number,
  year: number,
) {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, category:categories(name, icon)")
    .eq("family_id", member.family_id)
    .gte("date", startDate)
    .lte("date", endDate);

  const monthName = new Date(year, month - 1).toLocaleString("id-ID", {
    month: "long",
    year: "numeric",
  });

  if (!transactions || transactions.length === 0) {
    return ctx.reply(
      `📅 *Laporan ${monthName}*\n\nBelum ada transaksi tercatat untuk periode ini.`,
    );
  }

  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const byCategory = transactions.reduce(
    (acc, t) => {
      const catName = t.category?.name || "Lainnya";
      const catIcon = t.category?.icon || "📦";
      if (!acc[catName]) acc[catName] = { amount: 0, icon: catIcon };
      acc[catName].amount += Number(t.amount);
      return acc;
    },
    {} as Record<string, { amount: number; icon: string }>,
  );

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  });
  let report = `📊 *Laporan Keuangan ${monthName}*\n`;
  report += `━━━━━━━━━━━━━━━━━━━━\n`;
  report += `💰 Total Pengeluaran: *${formatter.format(total)}*\n\n`;

  Object.entries(byCategory)
    .sort((a, b) => b[1].amount - a[1].amount)
    .forEach(([name, data]) => {
      report += `${data.icon} *${name}*: ${formatter.format(data.amount)}\n`;
    });

  const budgetDiff = Number(member.families.total_budget) - total;
  report += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  report += `📊 Status Budget: *${budgetDiff >= 0 ? "Surplus" : "Defisit"}*\n`;
  report += `💡 _Saran: ${budgetDiff < 0 ? "Waduh, pengeluaran sudah lewat budget! Ayo lebih disiplin lagi." : "Kerja bagus! Terus pertahankan pola belanja hemat Anda."}_`;

  return ctx.reply(report, { parse_mode: "Markdown" });
}

bot.command("summary", async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const { data: member } = await supabase
    .from("family_members")
    .select("*, families(*)")
    .eq("telegram_id", telegramId)
    .single();
  if (!member) return ctx.reply("❌ Akun belum terdaftar.");

  const now = new Date();
  await ctx.replyWithChatAction("typing");
  return sendMonthlySummary(ctx, member, now.getMonth() + 1, now.getFullYear());
});

bot.command("export", async (ctx: Context) => {
  try {
    const telegramId = ctx.from?.id;
    const { data: member } = await supabase
      .from("family_members")
      .select("*, families(*)")
      .eq("telegram_id", telegramId)
      .single();
    if (!member) return ctx.reply("❌ Akun belum terdaftar.");

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*, category:categories(name)")
      .eq("family_id", member.family_id)
      .order("date", { ascending: false });
    if (!transactions || transactions.length === 0)
      return ctx.reply("📭 Belum ada data.");

    const totalSpend = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );
    const workbook = XLSX.utils.book_new();

    const summaryData = [
      { Keterangan: "Saldo Saat Ini", Nilai: member.families.total_balance },
      { Keterangan: "Sisa Budget", Nilai: member.families.total_budget },
      { Keterangan: "Total Pengeluaran (Data Terlampir)", Nilai: totalSpend },
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryData),
      "Summary",
    );

    const transactionSheetData = transactions.map((t) => ({
      Tanggal: new Date(t.date).toLocaleString("id-ID"),
      Kategori: t.category?.name || "Lainnya",
      Nominal: Number(t.amount),
      Catatan: t.note || "-",
    }));
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(transactionSheetData),
      "Transactions",
    );

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    await ctx.replyWithDocument(
      new InputFile(
        excelBuffer,
        `Laporan_Keuangan_${new Date().toISOString().split("T")[0]}.xlsx`,
      ),
    );
  } catch (err) {
    await ctx.reply("❌ Gagal membuat laporan.");
  }
});

bot.on("message:text", async (ctx: Context) => {
  console.log("=> Received message:text");
  const text = ctx.message?.text || "";
  const telegramId = ctx.from?.id;
  console.log("=> Telegram ID:", telegramId, "Text:", text);

  if (text.startsWith("/")) {
    console.log("=> Command message, ignoring here");
    return;
  }

  console.log("=> Fetching member data from Supabase");
  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .select("*, families(*)")
    .eq("telegram_id", telegramId)
    .single();

  if (memberError || !member) {
    console.log("=> Member not found or error:", memberError);
    return ctx.reply("❌ Akun belum terdaftar.");
  }

  console.log("=> Fetching categories");
  // Fetch dynamic categories
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("family_id", member.family_id);
  const categoriesList =
    categories?.map((c) => `${c.icon} ${c.name}`).join(", ") ||
    "Makan, Transport, Belanja, Tagihan, Kesehatan, Lainnya";

  const financialContext = `
    - User di keluarga: "${member.families.name}"
    - Saldo saat ini: Rp${member.families.total_balance}
    - Sisa budget bulan ini: Rp${member.families.total_budget}
    - Kategori yang tersedia: ${categoriesList}
  `;

  console.log("=> Sending typing action and asking AI");
  await ctx.replyWithChatAction("typing");
  const aiResponse = await askAI(text, financialContext);
  console.log("=> AI Response:", aiResponse);

  if (!aiResponse) {
    console.log("=> AI Response is null, sending fallback");
    return ctx.reply(
      "❓ Maaf, sepertinya saya sedang sedikit kebingungan. Bisa diulang?",
    );
  }

  const jsonMatch = aiResponse.match(/\{.*\}/s);
  let humanPart = aiResponse.replace(/\{.*\}/s, "").trim();
  console.log("=> Has JSON match:", !!jsonMatch);

  if (jsonMatch) {
    try {
      const aiParsed = JSON.parse(jsonMatch[0]);
      const formatter = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      });

      if (aiParsed.type === "update_balance") {
        await supabase
          .from("families")
          .update({ total_balance: aiParsed.amount })
          .eq("id", member.family_id);
        const reply =
          humanPart ||
          `Siap! Saldo Anda sudah saya perbarui menjadi *${formatter.format(aiParsed.amount)}*.`;
        return ctx.reply(reply, { parse_mode: "Markdown" });
      }

      if (aiParsed.type === "update_budget") {
        await supabase
          .from("families")
          .update({ total_budget: aiParsed.amount })
          .eq("id", member.family_id);
        const reply =
          humanPart ||
          `Baik, budget bulan ini sudah saya set ke *${formatter.format(aiParsed.amount)}*. Mari kita jaga bersama!`;
        return ctx.reply(reply, { parse_mode: "Markdown" });
      }

      if (aiParsed.type === "get_summary") {
        const month = aiParsed.month || new Date().getMonth() + 1;
        const year = aiParsed.year || new Date().getFullYear();
        if (humanPart) await ctx.reply(humanPart);
        return sendMonthlySummary(ctx, member, month, year);
      }

      if (aiParsed.type === "expense") {
        // Find category using AI's suggestion or fallback to first match
        let category = categories?.find(
          (c) => c.name.toLowerCase() === aiParsed.category.toLowerCase(),
        );
        if (!category) {
          const { data: fuzzyCategory } = await supabase
            .from("categories")
            .select("*")
            .eq("family_id", member.family_id)
            .ilike("name", `%${aiParsed.category}%`)
            .limit(1)
            .single();
          category = fuzzyCategory;
        }

        if (!category)
          return ctx.reply(
            `❌ Maaf, saya tidak menemukan kategori "${aiParsed.category}". Bisa gunakan kategori lain?`,
          );

        // 1. Insert Transaction
        await supabase.from("transactions").insert({
          family_id: member.family_id,
          category_id: category.id,
          amount: aiParsed.amount,
          note: aiParsed.note || "",
          source: "telegram",
          created_by: member.user_id,
          date: new Date().toISOString(),
        });

        // 2. Update Family Balance & Budget
        const newBalance =
          Number(member.families.total_balance) - aiParsed.amount;
        const newBudget =
          Number(member.families.total_budget) - aiParsed.amount;

        await supabase
          .from("families")
          .update({
            total_balance: newBalance,
            total_budget: newBudget,
          })
          .eq("id", member.family_id);

        // 3. Construct Confirmation
        let alertMsg = "";
        if (newBudget <= 0) {
          alertMsg = `\n\n🚨 *Peringatan:* Budget Anda sudah habis atau terlampaui!`;
        } else if (newBudget < 200000) {
          alertMsg = `\n\n⚠️ *Catatan:* Sisa budget Anda menipis (*${formatter.format(newBudget)}*).`;
        }

        const confirmationMsg = `✅ *Tercatat!*
💸 *${formatter.format(aiParsed.amount)}* — ${category.icon} ${category.name}
💰 Saldo: *${formatter.format(newBalance)}*
📊 Budget: *${formatter.format(newBudget)}*${alertMsg}

💬 _${aiParsed.advice || "Tetap semangat mengelola keuangan!"}_`;

        return ctx.reply(
          humanPart ? `${humanPart}\n\n${confirmationMsg}` : confirmationMsg,
          { parse_mode: "Markdown" },
        );
      }
    } catch (e) {
      console.error("JSON Parse Error:", e);
    }
  }

  // Default for normal chat or failed parse
  return ctx.reply(aiResponse.replace(/\{.*\}/s, "").trim() || aiResponse);
});

// Simple in-memory cache to deduplicate Telegram update retries
const processedUpdates = new Set<number>();
const MAX_CACHE_SIZE = 1000;

function isDuplicate(updateId: number): boolean {
  if (processedUpdates.has(updateId)) {
    return true;
  }
  processedUpdates.add(updateId);
  if (processedUpdates.size > MAX_CACHE_SIZE) {
    const firstKey = processedUpdates.keys().next().value;
    if (firstKey !== undefined) {
      processedUpdates.delete(firstKey);
    }
  }
  return false;
}

bot.catch(async (err) => {
  console.error(`Error while handling update ${err.ctx.update.update_id}:`);
  const e = err.error;
  let errMsg = "Unknown Error";
  if (e instanceof Error) {
    errMsg = e.message;
  } else {
    errMsg = String(e);
  }
  console.error(e);
  try {
    // Log to DB for debug
    await supabase.from("transactions").insert({
      family_id: "00000000-0000-0000-0000-000000000000",
      category_id: "00000000-0000-0000-0000-000000000000",
      amount: 0,
      note: errMsg,
      source: "error_log",
      created_by: "system"
    }).catch(() => {});
    await err.ctx.reply(`🚨 Terjadi kesalahan sistem: ${errMsg}`);
  } catch (replyErr) {
    console.error("Failed to send error message:", replyErr);
  }
});

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("webhook_info") === "true") {
    const token = Deno.env.get("TELEGRAM_TOKEN");
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  }

  if (url.searchParams.get("secret") !== Deno.env.get("FUNCTION_SECRET")) {
    return new Response("unauthorized", { status: 403 });
  }

  try {
    const update = await req.json();
    const updateId = update?.update_id;

    if (updateId) {
      if (isDuplicate(updateId)) {
        return new Response("ok", { status: 200 });
      }
    }

    try {
      await bot.handleUpdate(update);
    } catch (err) {
      console.error("Unhandled error in handleUpdate:", err);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Error handling request:", err);
    return new Response("ok", { status: 200 });
  }
});
