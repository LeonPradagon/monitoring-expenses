"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Tag, Clock, User } from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";

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

    // Add summary sheet
    const categoriesSummary = transactions.reduce((acc: any, t) => {
      const cat = t.category?.name || 'Lainnya';
      acc[cat] = (acc[cat] || 0) + parseFloat((t.amount || 0).toString());
      return acc;
    }, {});

    const summaryData = Object.entries(categoriesSummary).map(([name, amount]) => ({
      Kategori: name,
      Total: amount
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

    XLSX.writeFile(workbook, `MoneyTrack_Pro_${familyName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="text-primary w-5 h-5" /> Transaksi Terakhir
        </h2>
        <Button 
          onClick={exportToExcel} 
          variant="outline" 
          size="sm" 
          className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
          disabled={transactions.length === 0}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5">
              <TableHead className="text-muted-foreground font-medium">Tanggal</TableHead>
              <TableHead className="text-muted-foreground font-medium">Kategori</TableHead>
              <TableHead className="text-muted-foreground font-medium">Catatan</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Nominal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((t) => (
                <TableRow key={t.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(t.date), 'dd MMM, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{t.category?.icon || '📦'}</span>
                      <span className="text-sm font-medium text-white">{t.category?.name || 'Lainnya'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {t.note || '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {formatter.format(parseFloat((t.amount || 0).toString()))}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  Belum ada transaksi tercatat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
