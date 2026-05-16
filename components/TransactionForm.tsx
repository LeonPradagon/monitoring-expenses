"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, IndianRupee, Tag, FileText, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TransactionForm({ familyId, categories, onSuccess }: { familyId: string, categories: any[], onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("transactions")
      .insert({
        family_id: familyId,
        category_id: categoryId,
        amount: parseFloat(amount),
        note,
        source: "web",
        created_by: user?.id,
        date: new Date().toISOString()
      });

    if (!error) {
      setAmount("");
      setNote("");
      setCategoryId("");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
      <CardHeader className="pb-4 relative z-10">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" /> Catat Pengeluaran Baru
        </CardTitle>
        <CardDescription>Input data transaksi Anda secara manual di sini</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 relative z-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="space-y-2 md:col-span-3">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Nominal</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">Rp</div>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 pl-9 font-bold text-white h-11 focus:ring-primary/30"
                required
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-3">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Kategori</label>
            <Select value={categoryId} onValueChange={(value) => setCategoryId(value || "")} required>
              <SelectTrigger className="bg-white/5 border-white/10 h-11">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10 text-white">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="hover:bg-white/5 focus:bg-white/5">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm">{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-4">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Keterangan</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                placeholder="Belanja apa hari ini?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-white/5 border-white/10 pl-10 h-11 text-sm italic"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Simpan</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
