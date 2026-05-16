"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Target, Save, Loader2, TrendingUp, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function BalanceManager({ family, onUpdate }: { family: any, onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(family.total_balance?.toString() || "0");
  const [budget, setBudget] = useState(family.total_budget?.toString() || "0");
  const supabase = createClient();

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("families")
      .update({ 
        total_balance: parseFloat(balance),
        total_budget: parseFloat(budget)
      })
      .eq("id", family.id);

    if (!error) {
      onUpdate();
    }
    setLoading(false);
  };

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl relative overflow-hidden shadow-2xl group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" /> Finansial Master
        </CardTitle>
        <CardDescription>Sesuaikan saldo realita dan target budget Anda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Wallet size={12} className="text-emerald-400" /> Saldo Saat Ini
            </label>
            <div className="relative group/input">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">Rp</div>
              <Input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="bg-white/5 border-white/10 pl-10 font-bold text-xl text-white focus:ring-primary/50 transition-all h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Target size={12} className="text-violet-400" /> Target Budget
            </label>
            <div className="relative group/input">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">Rp</div>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-white/5 border-white/10 pl-10 font-bold text-xl text-white focus:ring-primary/50 transition-all h-12"
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleUpdate} 
          disabled={loading} 
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg shadow-primary/20 group-hover:scale-[1.02] transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Perubahan
        </Button>
      </CardContent>
    </Card>
  );
}
