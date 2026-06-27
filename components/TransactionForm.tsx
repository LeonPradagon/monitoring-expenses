"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, FileText, Zap } from "lucide-react";
import { createTransaction } from "@/lib/actions";

export function TransactionForm({ accounts, categories, onSuccess }: { accounts: any[], categories: any[], onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("expense");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;

    setLoading(true);
    try {
      await createTransaction({
        account_id: accountId,
        category_id: categoryId || undefined,
        type: type,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        description: description
      });

      setAmount("");
      setDescription("");
      setCategoryId("");
      onSuccess();
    } catch (error) {
      console.error("Failed to create transaction", error);
    }
    setLoading(false);
  };

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
      <CardHeader className="pb-4 relative z-10">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" /> Catat Transaksi Baru
        </CardTitle>
        <CardDescription>Input data transaksi Anda secara manual di sini</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 relative z-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Tipe</label>
            <Select value={type} onValueChange={(v) => setType(v || "expense")} required>
              <SelectTrigger className="bg-white/5 border-white/10 h-11 text-xs font-bold">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white">
                <SelectItem value="expense" className="text-rose-400 font-bold hover:bg-white/5">Expense</SelectItem>
                <SelectItem value="income" className="text-emerald-400 font-bold hover:bg-white/5">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Nominal</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">Rp</div>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 pl-9 font-bold text-white h-11 focus:ring-primary/30 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Akun</label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v || "")} required>
              <SelectTrigger className="bg-white/5 border-white/10 h-11 text-xs">
                <SelectValue placeholder="Pilih Akun" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="hover:bg-white/5">
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Kategori</label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v || "")}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11 text-xs">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white">
                {categories.filter(c => c.type === type).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="hover:bg-white/5">
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-3">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Keterangan</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
              <Input
                placeholder="Keterangan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 pl-8 h-11 text-xs italic"
              />
            </div>
          </div>

          <div className="md:col-span-1">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all px-0"
              title="Simpan"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
