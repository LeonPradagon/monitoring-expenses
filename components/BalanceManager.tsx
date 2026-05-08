"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Target, Save, Loader2, TrendingUp } from "lucide-react";
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
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Atur Saldo & Goal Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Wallet size={14} /> Total Saldo Saat Ini
            </label>
            <div className="relative">
              <Input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="bg-white/5 border-white/10 pl-9 font-bold text-lg text-emerald-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Target size={14} /> Goal Budget Bulanan
            </label>
            <div className="relative">
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-white/5 border-white/10 pl-9 font-bold text-lg text-primary"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleUpdate} 
          disabled={loading} 
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Update Saldo & Budget
        </Button>
      </CardContent>
    </Card>
  );
}
