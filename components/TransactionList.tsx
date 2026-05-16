"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Tag, Clock, User, MessageCircle, Globe, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import { format, isToday, isYesterday } from "date-fns";

export function TransactionList({ transactions, familyName }: { transactions: any[], familyName: string }) {
  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  const exportToExcel = () => {
    const worksheetData = transactions.map(t => ({
      Tanggal: format(new Date(t.date), 'dd/MM/yyyy HH:mm'),
      Kategori: t.category?.name || 'Lainnya',
      Nominal: parseFloat((t.amount || 0).toString()),
      Catatan: t.note || '-',
      Sumber: t.source,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
    XLSX.writeFile(workbook, `MoneyTrack_Pro_${familyName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups: any, t) => {
    const date = format(new Date(t.date), 'yyyy-MM-dd');
    if (!groups[date]) groups[date] = [];
    groups[date].push(t);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hari Ini";
    if (isYesterday(date)) return "Kemarin";
    return format(date, 'dd MMMM yyyy');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="text-primary w-5 h-5" /> Riwayat Transaksi
        </h2>
        <Button 
          onClick={exportToExcel} 
          variant="outline" 
          size="sm" 
          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          disabled={transactions.length === 0}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" /> Export Excel
        </Button>
      </div>

      <div className="space-y-8">
        {sortedDates.length > 0 ? (
          sortedDates.map((date) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <Calendar className="w-3 h-3" /> {getDateLabel(date)}
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              </div>
              
              <div className="grid gap-3">
                {groupedTransactions[date].map((t: any) => (
                  <div key={t.id} className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {t.category?.icon || '📦'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{t.category?.name || 'Lainnya'}</p>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            • {format(new Date(t.date), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {t.note || 'Tidak ada catatan'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-4">
                      <div className="hidden md:block">
                        <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">
                          {t.source === 'telegram' ? (
                            <><MessageCircle className="w-3 h-3 text-sky-400" /> Bot</>
                          ) : (
                            <><Globe className="w-3 h-3 text-emerald-400" /> Web</>
                          )}
                        </div>
                        <p className="text-lg font-bold text-white tracking-tight">
                          {formatter.format(parseFloat((t.amount || 0).toString()))}
                        </p>
                      </div>
                      <div className="md:hidden text-right">
                         <p className="text-base font-bold text-white">
                          {formatter.format(parseFloat((t.amount || 0).toString()))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 opacity-20" />
            </div>
            <p>Belum ada transaksi tercatat untuk periode ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
