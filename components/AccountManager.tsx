"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Save, Loader2, Sparkles, Plus, Trash2 } from "lucide-react";
import { createAccount, deleteAccount } from "@/lib/actions";

export function AccountManager({ accounts, onUpdate }: { accounts: any[], onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [newType, setNewType] = useState("bank");

  const handleAddAccount = async () => {
    if (!newName) return;
    setLoading(true);
    
    try {
      await createAccount({
        name: newName,
        type: newType,
        balance: parseFloat(newBalance) || 0,
        currency: 'IDR'
      });
      setNewName("");
      setNewBalance("");
      onUpdate();
    } catch (error: any) {
      alert("Gagal menambahkan akun: " + error.message);
    } finally {
      setLoading(false);
    }
  }; 


  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun ini? Transaksi yang terkait mungkin akan error atau terhapus.")) return;

    setLoadingId(id);
    try {
      await deleteAccount(id);
      onUpdate();
    } catch (error: any) {
      alert("Gagal menghapus akun: " + error.message);
    } finally {
      setLoadingId(null);
    }
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl relative overflow-hidden shadow-2xl group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" /> Akun Keuangan
        </CardTitle>
        <CardDescription>Kelola dompet, rekening bank, dan e-wallet Anda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        <div className="space-y-3">
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <div>
                <div className="font-bold text-white text-sm">{acc.name}</div>
                <div className="text-xs text-muted-foreground uppercase">{acc.type}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="font-mono text-emerald-400 text-sm font-bold">
                  {formatter.format(acc.balance)}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 px-2 h-8"
                  onClick={() => handleDeleteAccount(acc.id)}
                  disabled={loadingId === acc.id}
                >
                  {loadingId === acc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground italic">Belum ada akun.</div>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 space-y-3">
          <h4 className="text-sm font-bold text-white">Tambah Akun Baru</h4>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Nama (ex: BCA)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-white/5 border-white/10 h-10 text-sm"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-md px-3 text-sm text-white"
            >
              <option value="bank">Bank</option>
              <option value="ewallet">E-Wallet</option>
              <option value="cash">Cash / Tunai</option>
            </select>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">Rp</div>
            <Input
              type="number"
              placeholder="Saldo Awal"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="bg-white/5 border-white/10 pl-10 h-10 text-sm"
            />
          </div>
          <Button 
            onClick={handleAddAccount} 
            disabled={loading || !newName} 
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Tambah Akun
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
