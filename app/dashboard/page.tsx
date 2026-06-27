"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { TelegramConnect } from "@/components/TelegramConnect";
import { StatsDashboard } from "@/components/StatsDashboard";
import { TransactionList } from "@/components/TransactionList";
import { TransactionForm } from "@/components/TransactionForm";
import { CategoryManager } from "@/components/CategoryManager";
import { AccountManager } from "@/components/AccountManager";
import { getDashboardData } from "@/lib/actions";

import BudgetWidget from "@/components/BudgetWidget";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
      } else {
        setUser(user);
      }
      setLoadingAuth(false);
    }
    checkAuth();
  }, [router, supabase]);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoadingStats(true);
      const data = await getDashboardData();
      if (data) {
        setCategories(data.categories);
        setTransactions(data.transactions);
        setAccounts(data.accounts);
      }
      setLoadingStats(false);
    }

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Personal Dashboard</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring
            </p>
            <div className="h-4 w-px bg-white/10" />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer hover:text-primary transition-colors"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i} className="bg-zinc-900 text-white">
                  {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
                </option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer hover:text-primary transition-colors"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-zinc-900 text-white">{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <TelegramConnect user={user} />
          <div className="flex gap-4">
            <Button onClick={async () => {
               await supabase.auth.signOut();
               router.push("/auth");
            }} variant="ghost" className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 h-10">Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-12">
        {loadingStats ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <StatsDashboard 
              transactions={transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
              })} 
              categories={categories} 
              accounts={accounts}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-12">
                <TransactionForm 
                  categories={categories} 
                  accounts={accounts}
                  onSuccess={() => {
                    const fetchData = async () => {
                      const data = await getDashboardData();
                      if (data) {
                        setCategories(data.categories);
                        setTransactions(data.transactions);
                        setAccounts(data.accounts);
                      }
                    };
                    fetchData();
                  }} 
                />
                <TransactionList 
                  transactions={transactions.filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
                  })} 
                  onUpdate={() => {
                    const fetchData = async () => {
                      const data = await getDashboardData();
                      if (data) {
                        setCategories(data.categories);
                        setTransactions(data.transactions);
                        setAccounts(data.accounts);
                      }
                    };
                    fetchData();
                  }}
                />
              </div>
              
              <div className="space-y-8">
                <AccountManager 
                  accounts={accounts} 
                  onUpdate={async () => {
                    const data = await getDashboardData();
                    if (data) {
                      setAccounts(data.accounts);
                    }
                  }}
                />
                <CategoryManager 
                  categories={categories} 
                  onUpdate={async () => {
                    const data = await getDashboardData();
                    if (data) {
                      setCategories(data.categories);
                    }
                  }} 
                />
                <BudgetWidget />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
