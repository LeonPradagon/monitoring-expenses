"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Target, Plus, Trash2, Pencil, Check, X, Wallet } from "lucide-react";
import { createBudget, deleteBudget, updateBudget } from "@/lib/actions";
import Swal from "sweetalert2";

interface Budget {
  id: string;
  category_id: string;
  name: string;
  amount: number;
  spent: number;
  period: string;
}

export function BudgetManager({ categories }: { categories: any[] }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Create state
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newPeriod, setNewPeriod] = useState("monthly");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPeriod, setEditPeriod] = useState("monthly");

  const fetchBudgets = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const userId = userData.user.id;

      const date = new Date();
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (budgetError || !budgetData) throw budgetError;

      // Fetch expenses for the month
      const { data: expenses, error: expenseError } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);
        
      if (expenseError) throw expenseError;

      const budgetsWithSpent = budgetData.map(b => {
        const spent = (expenses || [])
          .filter(e => e.category_id === b.category_id)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        return { ...b, spent };
      });

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [supabase]);

  const handleAddBudget = async () => {
    if (!newCategoryId || !newAmount) return;
    setLoadingId('new');

    const cat = categories.find(c => c.id === newCategoryId);
    const budgetName = `Budget ${cat?.name || 'Kategori'}`;

    try {
      const res = await createBudget({
        category_id: newCategoryId,
        amount: parseFloat(newAmount),
        period: newPeriod,
        name: budgetName
      });

      if (res?.error) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: res.error, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' });
        return;
      }

      setNewCategoryId("");
      setNewAmount("");
      fetchBudgets();
      
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Budget berhasil ditambahkan!', background: '#18181b', color: '#fff', confirmButtonColor: '#10b981', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: "Gagal menambahkan budget: " + error.message, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpdateBudget = async (id: string) => {
    if (!editAmount) return;
    setLoadingId(id);

    try {
      const res = await updateBudget(id, {
        amount: parseFloat(editAmount),
        period: editPeriod
      });

      if (res?.error) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: res.error, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' });
        return;
      }

      setEditingId(null);
      fetchBudgets();
      
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Budget berhasil diperbarui!', background: '#18181b', color: '#fff', confirmButtonColor: '#10b981', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: "Gagal memperbarui budget: " + error.message, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    const result = await Swal.fire({
      title: 'Hapus Budget?',
      text: "Anda yakin ingin menghapus budget ini?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3f3f46',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal',
      background: '#18181b',
      color: '#fff'
    });

    if (!result.isConfirmed) return;
    
    setLoadingId(id);
    try {
      const res = await deleteBudget(id);
      
      if (res?.error) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: res.error, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' });
        return;
      }
      
      fetchBudgets();
      
      Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Budget berhasil dihapus.', background: '#18181b', color: '#fff', confirmButtonColor: '#10b981', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: "Gagal menghapus budget: " + error.message, background: '#18181b', color: '#fff', confirmButtonColor: '#10b981' });
    } finally {
      setLoadingId(null);
    }
  };

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  return (
    <Card className="border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-500" /> Budget Bulanan
        </CardTitle>
        <CardDescription>Kelola batasan pengeluaran Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-white/5 rounded-lg w-full"></div>
            <div className="h-16 bg-white/5 rounded-lg w-full"></div>
          </div>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {budgets.map((budget) => {
              const percentage = Math.min((budget.spent / budget.amount) * 100, 100);
              let progressColor = "bg-emerald-500";
              if (percentage > 90) progressColor = "bg-rose-500";
              else if (percentage > 75) progressColor = "bg-amber-500";

              return (
                <div key={budget.id} className="p-3 rounded-lg bg-white/5 border border-white/5 group hover:bg-white/[0.08] transition-all">
                  {editingId === budget.id ? (
                    <div className="flex-1 flex items-center gap-2 mb-2">
                      <Input 
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="bg-zinc-950/50 border-white/10 h-8 text-sm w-full"
                        autoFocus
                      />
                      <select
                        value={editPeriod}
                        onChange={(e) => setEditPeriod(e.target.value)}
                        className="bg-zinc-950 border border-white/10 rounded-md px-2 text-sm text-white w-24 h-8"
                      >
                        <option value="monthly">Bulan</option>
                        <option value="weekly">Minggu</option>
                      </select>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 h-8 w-8 p-0 shrink-0"
                        onClick={() => handleUpdateBudget(budget.id)}
                        disabled={loadingId === budget.id}
                      >
                        {loadingId === budget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 h-8 w-8 p-0 shrink-0"
                        onClick={() => setEditingId(null)}
                        disabled={loadingId === budget.id}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm">{budget.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatter.format(budget.spent)} / {formatter.format(budget.amount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-sky-500 hover:bg-sky-500/20 hover:text-sky-400 h-8 w-8 p-0"
                          onClick={() => {
                            setEditingId(budget.id);
                            setEditAmount(budget.amount.toString());
                            setEditPeriod(budget.period);
                          }}
                          disabled={loadingId !== null}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 h-8 w-8 p-0"
                          onClick={() => handleDeleteBudget(budget.id)}
                          disabled={loadingId === budget.id}
                        >
                          {loadingId === budget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${progressColor} transition-all duration-500 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  {percentage > 90 && !editingId && (
                    <p className="text-[10px] text-rose-500 font-medium text-right mt-1">⚠️ Hampir habis!</p>
                  )}
                </div>
              );
            })}
            {budgets.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground italic">Belum ada budget.</div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-white/10 space-y-3">
          <h4 className="text-sm font-bold text-white">Tambah Budget</h4>
          <div className="space-y-2">
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-md px-3 h-9 text-sm text-white w-full"
            >
              <option value="">Pilih Kategori...</option>
              {categories.filter(c => c.type === 'expense').map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Nominal"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="bg-zinc-950/50 border-white/10 h-9 text-sm flex-1"
              />
              <select
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                className="bg-zinc-950 border border-white/10 rounded-md px-2 text-sm text-white w-24 h-9"
              >
                <option value="monthly">Bulan</option>
                <option value="weekly">Minggu</option>
              </select>
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={handleAddBudget}
            disabled={loadingId === 'new' || !newCategoryId || !newAmount}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-9"
          >
            {loadingId === 'new' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Tambah Budget
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
