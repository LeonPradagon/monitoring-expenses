import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { Bot } from "grammy";
import ExcelJS from 'exceljs';

const bot = new Bot(process.env.TELEGRAM_SECRET_TOKEN || "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; 
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET(req: Request) {
  try {
    // Optional: Protect cron route
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get previous month start and end dates
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0); // Last day of previous month
    const monthName = startOfMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];

    // Fetch all users who have telegram_chat_id
    const { data: users } = await supabaseAdmin.from('user_settings').select('user_id, telegram_chat_id').not('telegram_chat_id', 'is', null);

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users with telegram linked' });
    }

    for (const user of users) {
      // 1. Fetch transactions for previous month
      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select(`
          date, type, amount, description, source,
          accounts(name), categories(name)
        `)
        .eq('user_id', user.user_id)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

      // 2. Fetch current balances
      const { data: accounts } = await supabaseAdmin
        .from('accounts')
        .select('name, balance')
        .eq('user_id', user.user_id)
        .eq('is_active', true);

      // Create Workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MoneyTrack Pro';
      workbook.created = new Date();

      // --- Sheet 1: Ringkasan ---
      const summarySheet = workbook.addWorksheet('Ringkasan');
      summarySheet.columns = [
        { header: 'Keterangan', key: 'label', width: 25 },
        { header: 'Nominal', key: 'amount', width: 25 }
      ];

      // Styling Headers
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

      let totalIncome = 0;
      let totalExpense = 0;
      if (transactions) {
        transactions.forEach(t => {
          if (t.type === 'income') totalIncome += Number(t.amount);
          if (t.type === 'expense') totalExpense += Number(t.amount);
        });
      }

      summarySheet.addRow({ label: 'Total Pemasukan', amount: totalIncome });
      summarySheet.addRow({ label: 'Total Pengeluaran', amount: totalExpense });
      summarySheet.addRow({ label: 'Selisih (Net)', amount: totalIncome - totalExpense });
      
      summarySheet.addRow({}); // Empty row
      summarySheet.addRow({ label: 'SALDO AKUN', amount: '' }).font = { bold: true };
      
      if (accounts) {
        accounts.forEach(acc => {
          summarySheet.addRow({ label: acc.name, amount: Number(acc.balance) });
        });
      }

      // Format currency column
      summarySheet.getColumn('amount').numFmt = '"Rp" #,##0.00;[Red]-"Rp" #,##0.00';

      // --- Sheet 2: Transaksi ---
      const txSheet = workbook.addWorksheet('Daftar Transaksi');
      txSheet.columns = [
        { header: 'Tanggal', key: 'date', width: 15 },
        { header: 'Akun', key: 'account', width: 20 },
        { header: 'Kategori', key: 'category', width: 20 },
        { header: 'Tipe', key: 'type', width: 15 },
        { header: 'Keterangan', key: 'desc', width: 30 },
        { header: 'Nominal', key: 'amount', width: 20 },
      ];

      txSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      txSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

      if (transactions) {
        transactions.forEach(t => {
          txSheet.addRow({
            date: t.date,
            account: t.accounts?.name || '-',
            category: t.categories?.name || '-',
            type: t.type === 'income' ? 'Pemasukan' : (t.type === 'expense' ? 'Pengeluaran' : 'Transfer'),
            desc: t.description || '-',
            amount: Number(t.amount)
          });
        });
      }

      txSheet.getColumn('amount').numFmt = '"Rp" #,##0.00;[Red]-"Rp" #,##0.00';

      // Generate Buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Send to Telegram
      try {
        await bot.api.sendDocument(
          user.telegram_chat_id,
          new (require('grammy').InputFile)(Buffer.from(buffer), `MoneyTrack_Laporan_${monthName.replace(' ', '_')}.xlsx`),
          {
            caption: `📊 *Laporan Keuangan Bulanan*\n\nBerikut adalah rekap transaksi dan saldo akhir Anda untuk bulan *${monthName}*.\n\nPemasukan: Rp ${totalIncome.toLocaleString('id-ID')}\nPengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`,
            parse_mode: 'Markdown'
          }
        );
      } catch (err) {
        console.error(`Failed to send report to ${user.telegram_chat_id}`, err);
      }
    }

    return NextResponse.json({ message: 'Cron job executed successfully' });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
