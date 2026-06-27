import { Bot, InlineKeyboard } from "grammy";
import { createClient } from "@supabase/supabase-js";
import { parseNaturalLanguage } from "@/lib/ai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; 
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export function setupHandlers(bot: Bot) {
  bot.command("start", async (ctx) => {
    const userId = ctx.match;
    if (!userId) {
      return ctx.reply("Silakan hubungkan akun melalui Web Dashboard MoneyTrack Pro terlebih dahulu.");
    }

    try {
      // Check if valid user in db
      const { data: user, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userErr || !user) {
        return ctx.reply("Gagal menghubungkan. User tidak ditemukan.");
      }

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

      await ctx.reply(
        "✅ <b>Akun Telegram Anda berhasil dihubungkan ke MoneyTrack Pro!</b>\n\n" +
        "Mulai sekarang, Anda bisa mencatat transaksi langsung dari sini. Ketik aja:\n" +
        "<i>\"Beli kopi 25rb pakai gopay\"</i>\n\n" +
        "Ketik /bantuan untuk melihat panduan lengkapnya.",
        { parse_mode: "HTML" }
      );
    } catch (error: any) {
      console.error("Link error:", error);
      // Ensure we don't throw UUID validation errors up to Grammy
      await ctx.reply("❌ Gagal menghubungkan akun. ID pengguna tidak valid atau terjadi error sistem.");
    }
  });

  bot.on("message:text", async (ctx) => {
    const { data: userSettings } = await supabaseAdmin
      .from('user_settings')
      .select('user_id')
      .eq('telegram_chat_id', ctx.chat.id.toString())
      .maybeSingle();

    const userId = userSettings?.user_id;
    if (!userId) return ctx.reply("Akun belum terhubung. Klik connect dari Web Dashboard.");

    // /bantuan command
    if (ctx.message?.text === "/bantuan" || ctx.message?.text === "/help") {
      return ctx.reply(
        "👋 <b>Bantuan Nanalys</b>\n\n" +
        "Ketik aja transaksimu pakai bahasa sehari-hari. Contoh:\n" +
        "• <i>Makan siang 50rb pakai BCA</i>\n" +
        "• <i>Gaji masuk 5jt ke Mandiri</i>\n" +
        "• <i>Beli kopi 25k</i>\n\n" +
        "Nanalys bakal otomatis catat ke akun & kategori yang pas!",
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().url("Lihat Dashboard", process.env.NEXT_PUBLIC_APP_URL || "https://monitoring-expenses.vercel.app")
        }
      );
    }

    // Command check for /saldo
    if (ctx.message?.text === "/saldo") {
      const { data: accounts } = await supabaseAdmin.from('accounts').select('*').eq('user_id', userId);
      if (!accounts || accounts.length === 0) return ctx.reply("Belum ada akun keuangan yang terdaftar.");
      
      const balances = accounts.map(a => `💰 <b>${a.name}</b>: Rp ${Number(a.balance).toLocaleString('id-ID')}`).join('\n');
      return ctx.reply(`<b>Saldo Akun Anda:</b>\n\n${balances}`, {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().url("Cek Detail di Web", process.env.NEXT_PUBLIC_APP_URL || "https://monitoring-expenses.vercel.app")
      });
    }

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

    if (!parsed) {
      return ctx.reply("Maaf, Nanalys tidak mengerti maksudmu. Coba sampaikan dengan lebih jelas ya!");
    }

    if (parsed.intent === "error") {
      return ctx.reply(parsed.message || "Terjadi kesalahan sistem AI.");
    }

    if (parsed.intent === "conversational") {
      return ctx.reply(parsed.response_message || "Maaf, aku nggak ngerti maksudmu.", { parse_mode: "HTML" });
    }

    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

    if (parsed.intent === "check_balance") {
      if (parsed.account_name) {
        const acc = context.accounts.find((a: any) => a.name.toLowerCase().includes(parsed.account_name.toLowerCase()));
        if (acc) {
          const { data: dbAcc } = await supabaseAdmin.from('accounts').select('balance').eq('id', acc.id).single();
          const bal = parseFloat(dbAcc?.balance || 0);
          return ctx.reply(`💰 <b>Saldo ${acc.name}</b> Anda saat ini adalah: <b>${formatter.format(bal)}</b>`, { parse_mode: "HTML" });
        } else {
          return ctx.reply(`Maaf, aku tidak menemukan akun bernama "${parsed.account_name}".`);
        }
      } else {
        const { data: accounts } = await supabaseAdmin.from('accounts').select('name, balance').eq('user_id', userId);
        const total = accounts?.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0) || 0;
        const details = accounts?.map(a => `- ${a.name}: ${formatter.format(parseFloat(a.balance || 0))}`).join('\n');
        return ctx.reply(`💰 <b>Total Saldo Keseluruhan: ${formatter.format(total)}</b>\n\nDetail:\n${details}`, { parse_mode: "HTML" });
      }
    }

    if (parsed.intent === "check_budget") {
      const { data: budgets } = await supabaseAdmin.from('budgets').select('*, categories(name)').eq('user_id', userId).eq('is_active', true);
      
      if (!budgets || budgets.length === 0) {
        return ctx.reply("Anda belum memiliki budget yang aktif bulan ini.");
      }

      // Calculate spending for this month for the budgets
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const { data: expenses } = await supabaseAdmin
        .from('transactions')
        .select('amount, category_id')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      let replyMsg = "📊 <b>Status Budget Anda Bulan Ini:</b>\n\n";

      for (const b of budgets) {
        if (parsed.category_name && !b.name.toLowerCase().includes(parsed.category_name.toLowerCase()) && !(b.categories?.name || "").toLowerCase().includes(parsed.category_name.toLowerCase())) {
          continue; // skip if filtering by specific category
        }
        
        const spent = expenses?.filter(e => e.category_id === b.category_id).reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
        const remaining = parseFloat(b.amount) - spent;
        const percent = Math.min(100, Math.round((spent / parseFloat(b.amount)) * 100));
        const icon = percent >= 100 ? "🔴" : percent >= (b.alert_at || 80) ? "🟡" : "🟢";
        
        replyMsg += `${icon} <b>${b.name}</b>\n`;
        replyMsg += `Terpakai: ${formatter.format(spent)} (${percent}%)\n`;
        replyMsg += `Sisa: <b>${formatter.format(remaining)}</b> dari ${formatter.format(parseFloat(b.amount))}\n\n`;
      }

      if (replyMsg === "📊 <b>Status Budget Anda Bulan Ini:</b>\n\n") {
         return ctx.reply(`Maaf, aku tidak menemukan budget untuk kategori "${parsed.category_name}".`);
      }

      return ctx.reply(replyMsg, { parse_mode: "HTML" });
    }

    if (parsed.intent === "create_transaction") {
      try {
        let accountId = parsed.account_id;
        if (!context.accounts.some(a => a.id === accountId)) {
          accountId = context.accounts[0]?.id;
        }
        if (!accountId) {
          return ctx.reply("❌ Belum ada akun keuangan. Silakan buat akun (seperti Dompet/Bank) terlebih dahulu di Web Dashboard MoneyTrack Pro.");
        }

        // Calculate new balance
        const { data: accountData } = await supabaseAdmin.from('accounts').select('balance').eq('id', accountId).single();
        let currentBalance = parseFloat(accountData?.balance || 0);
        const amount = parseFloat(parsed.amount);
        if (parsed.type === 'expense') currentBalance -= amount;
        else if (parsed.type === 'income') currentBalance += amount;

        await supabaseAdmin.from('accounts').update({ balance: currentBalance }).eq('id', accountId);

        let categoryId = parsed.category_id;
        
        if (!categoryId && parsed.category_name) {
          // Auto-create category if AI provided a name but no ID
          const { data: newCategory, error: createCatErr } = await supabaseAdmin
            .from('categories')
            .insert({ user_id: userId, name: parsed.category_name, type: parsed.type === 'income' ? 'income' : 'expense' })
            .select()
            .single();
            
          if (!createCatErr && newCategory) {
            categoryId = newCategory.id;
          }
        }

        await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          account_id: accountId,
          category_id: categoryId || null,
          type: parsed.type,
          amount: amount,
          description: parsed.description,
          date: new Date().toISOString().split('T')[0],
          source: 'telegram',
          ai_categorized: true
        });
        
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
        const amountStr = formatter.format(amount);
        const typeStr = parsed.type === 'income' ? 'Pemasukan 📈' : 'Pengeluaran 📉';
        
        let budgetAlertMsg = "";
        
        // Real-time Budget Check
        if (parsed.type === 'expense' && categoryId) {
          const { data: budget } = await supabaseAdmin
            .from('budgets')
            .select('amount, alert_at, name')
            .eq('user_id', userId)
            .eq('category_id', categoryId)
            .single();
            
          if (budget) {
            const date = new Date();
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
            
            // Calculate total expenses for this category in the current month
            const { data: expenses } = await supabaseAdmin
              .from('transactions')
              .select('amount')
              .eq('user_id', userId)
              .eq('category_id', categoryId)
              .eq('type', 'expense')
              .gte('date', startOfMonth)
              .lte('date', endOfMonth);
              
            const totalSpent = (expenses || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
            const budgetAmount = Number(budget.amount);
            const alertThreshold = budget.alert_at ? Number(budget.alert_at) / 100 : 0.8;
            
            if (totalSpent >= budgetAmount) {
              budgetAlertMsg = `\n\n🚨 <b>PERINGATAN</b>: Pengeluaran "${budget.name}" bulan ini (${formatter.format(totalSpent)}) sudah <b>MELEBIHI</b> budget (${formatter.format(budgetAmount)})! Hati-hati ya!`;
            } else if (totalSpent >= budgetAmount * alertThreshold) {
              budgetAlertMsg = `\n\n⚠️ <b>Peringatan</b>: Sisa budget "${budget.name}" bulan ini tinggal <b>${formatter.format(budgetAmount - totalSpent)}</b>. Yuk mulai hemat!`;
            }
          }
        }
        
        return ctx.reply(
          `✅ <b>Transaksi Berhasil Dicatat!</b>\n\n` +
          `📝 <b>Keterangan</b>: ${parsed.description}\n` +
          `💵 <b>Nominal</b>: ${amountStr}\n` +
          `🏷️ <b>Tipe</b>: ${typeStr}` +
          budgetAlertMsg + `\n\n` +
          `Semangat terus atur keuangannya! 🚀`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().url("Cek di Web", process.env.NEXT_PUBLIC_APP_URL || "https://monitoring-expenses.vercel.app")
          }
        );
      } catch (error) {
        console.error(error);
        return ctx.reply("❌ Gagal mencatat transaksi. Terjadi kesalahan pada sistem.");
      }
    }

    if (parsed.intent === "update_balance") {
      try {
        let accountId = parsed.account_id;
        if (!context.accounts.some(a => a.id === accountId)) {
          accountId = context.accounts[0]?.id;
        }
        if (!accountId) {
          return ctx.reply("❌ Belum ada akun keuangan. Silakan buat akun (seperti Dompet/Bank) terlebih dahulu di Web Dashboard MoneyTrack Pro.");
        }

        const { data: accountData } = await supabaseAdmin.from('accounts').select('balance, name').eq('id', accountId).single();
        const currentBalance = parseFloat(accountData?.balance || 0);
        const targetBalance = parseFloat(parsed.amount);
        const difference = targetBalance - currentBalance;

        if (difference === 0) {
          return ctx.reply(`✅ Saldo ${accountData?.name} sudah sesuai dengan Rp ${targetBalance.toLocaleString('id-ID')}.`);
        }

        const txType = difference > 0 ? 'income' : 'expense';
        const txAmount = Math.abs(difference);

        await supabaseAdmin.from('accounts').update({ balance: targetBalance }).eq('id', accountId);

        await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          account_id: accountId,
          category_id: null,
          type: txType,
          amount: txAmount,
          description: "Penyesuaian Saldo (Sistem)",
          date: new Date().toISOString().split('T')[0],
          source: 'telegram',
          ai_categorized: true
        });
        
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
        const sign = difference > 0 ? '+' : '-';
        
        return ctx.reply(
          `✅ <b>Saldo ${accountData?.name} Berhasil Diperbarui!</b>\n\n` +
          `💰 <b>Saldo Akhir</b>: ${formatter.format(targetBalance)}\n` +
          `📝 <i>(Penyesuaian Otomatis: ${sign}${formatter.format(txAmount)})</i>\n`,
          {
            parse_mode: "HTML",
            reply_markup: new InlineKeyboard().url("Cek di Web", process.env.NEXT_PUBLIC_APP_URL || "https://monitoring-expenses.vercel.app")
          }
        );
      } catch (error) {
        console.error(error);
        return ctx.reply("❌ Gagal memperbarui saldo. Terjadi kesalahan sistem.");
      }
    }

    if (parsed.intent === "create_account") {
      try {
        const name = parsed.name || "Akun Baru";
        const type = parsed.type || "cash";
        const initialBalance = parseFloat(parsed.balance || 0);
        
        // Define colors/icons based on type
        const typeColors: Record<string, string> = { bank: "blue", ewallet: "green", cash: "orange", credit: "red" };
        const typeIcons: Record<string, string> = { bank: "building-columns", ewallet: "wallet", cash: "money-bill", credit: "credit-card" };
        
        const { error: insertErr } = await supabaseAdmin.from('accounts').insert({
          user_id: userId,
          name: name,
          type: type,
          balance: initialBalance,
          color: typeColors[type] || "blue",
          icon: typeIcons[type] || "wallet"
        });
        
        if (insertErr) throw insertErr;
        
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
        return ctx.reply(
          `✅ <b>Akun "${name}" Berhasil Dibuat!</b>\n\n` +
          `💳 <b>Tipe</b>: ${type}\n` +
          `💰 <b>Saldo Awal</b>: ${formatter.format(initialBalance)}\n\n` +
          `Sekarang kamu bisa mencatat transaksi ke akun ini!`,
          { parse_mode: "HTML" }
        );
      } catch (error) {
        console.error("Create account error:", error);
        return ctx.reply("❌ Gagal membuat akun. Terjadi kesalahan sistem.");
      }
    }

    if (parsed.intent === "set_budget") {
      try {
        let categoryId = parsed.category_id;
        let categoryName = parsed.category_name;
        
        if (!categoryId) {
          if (!categoryName) {
            return ctx.reply("❌ Kategori tidak ditemukan. Silakan sebutkan nama kategori yang jelas untuk budget ini (misal: 'makanan', 'transportasi').");
          }
          // Auto-create category if it doesn't exist
          const { data: newCategory, error: createCatErr } = await supabaseAdmin
            .from('categories')
            .insert({ user_id: userId, name: categoryName, type: 'expense' })
            .select()
            .single();
            
          if (createCatErr || !newCategory) throw new Error("Failed to create category");
          categoryId = newCategory.id;
          categoryName = newCategory.name;
        } else {
          const category = context.categories.find((c: any) => c.id === categoryId);
          categoryName = category?.name || "Kategori";
        }
        
        const amount = parseFloat(parsed.amount);
        const period = parsed.period || "monthly";
        const budgetName = `Budget ${categoryName}`;
        
        // Cek apakah sudah ada budget untuk kategori ini
        const { data: existingBudget } = await supabaseAdmin
          .from('budgets')
          .select('id')
          .eq('user_id', userId)
          .eq('category_id', categoryId)
          .single();
          
        if (existingBudget) {
          // Update existing
          await supabaseAdmin.from('budgets').update({ amount, period }).eq('id', existingBudget.id);
        } else {
          // Insert new
          await supabaseAdmin.from('budgets').insert({
            user_id: userId,
            category_id: categoryId,
            name: budgetName,
            amount: amount,
            period: period
          });
        }
        
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
        return ctx.reply(
          `✅ <b>Budget Berhasil Ditetapkan!</b>\n\n` +
          `📊 <b>Kategori</b>: ${categoryName}\n` +
          `💰 <b>Anggaran</b>: ${formatter.format(amount)} / ${period === 'monthly' ? 'Bulan' : 'Minggu'}\n\n` +
          `Saya akan mengawasinya. Gunakan uangmu dengan bijak! 💼`,
          { parse_mode: "HTML" }
        );
      } catch (error) {
        console.error("Set budget error:", error);
        return ctx.reply("❌ Gagal mengatur budget. Terjadi kesalahan sistem.");
      }
    }
  });
}
