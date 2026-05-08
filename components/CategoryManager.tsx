"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Target, Save, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function CategoryManager({ categories, onUpdate }: { categories: any[], onUpdate: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>({});
  const supabase = createClient();

  const handleUpdateBudget = async (categoryId: string) => {
    const newLimit = editingBudgets[categoryId];
    if (!newLimit) return;

    setLoadingId(categoryId);
    const { error } = await supabase
      .from("categories")
      .update({ budget_limit: parseFloat(newLimit) })
      .eq("id", categoryId);

    if (!error) {
      onUpdate();
      const newEditingBudgets = { ...editingBudgets };
      delete newEditingBudgets[categoryId];
      setEditingBudgets(newEditingBudgets);
    }
    setLoadingId(null);
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-500" /> Atur Budget Bulanan
        </CardTitle>
        <CardDescription>Sesuaikan limit pengeluaran untuk setiap kategori.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 gap-4 group hover:bg-white/[0.08] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                {cat.icon}
              </div>
              <div>
                <div className="font-bold text-white">{cat.name}</div>
                <div className="text-xs text-muted-foreground">Limit Saat Ini: {formatter.format(cat.budget_limit)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-40">
                <Input
                  type="number"
                  placeholder="Limit Baru"
                  value={editingBudgets[cat.id] ?? ""}
                  onChange={(e) => setEditingBudgets({ ...editingBudgets, [cat.id]: e.target.value })}
                  className="bg-zinc-950/50 border-white/10 h-9 pl-8 text-sm"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">Rp</span>
              </div>
              <Button 
                size="sm" 
                onClick={() => handleUpdateBudget(cat.id)}
                disabled={loadingId === cat.id || !editingBudgets[cat.id]}
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-9 px-3"
              >
                {loadingId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
