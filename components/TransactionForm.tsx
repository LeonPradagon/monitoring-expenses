"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, IndianRupee, Tag, FileText } from "lucide-react";
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
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-white/5 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Catat Pengeluaran
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground ml-1">Nominal (Rp)</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="Contoh: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/10 pl-9"
                required
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">Rp</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground ml-1">Kategori</label>
            <Select value={categoryId} onValueChange={(value) => setCategoryId(value || "")} required>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Catatan (Opsional)</label>
            <div className="relative">
              <Input
                placeholder="Beli apa?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-white/5 border-white/10 pl-9"
              />
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 shadow-lg shadow-primary/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tambah Transaksi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
