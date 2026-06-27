"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, Target, CreditCard, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function StatsDashboard({ transactions, categories, accounts }: { transactions: any[], categories: any[], accounts: any[] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);

  // Data for Pie Chart (Expense by Category)
  const pieData = categories.filter(c => c.type === 'expense').map(cat => {
    const spent = transactions
      .filter(t => t.category_id === cat.id && t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
    return { name: cat.name, value: spent };
  }).filter(d => d.value > 0);

  // Data for Area Chart (Day-wise spending)
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const spent = transactions
      .filter(t => t.type === 'expense')
      .filter(t => {
        const d = new Date(t.date);
        return d.getDate() === day;
      })
      .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
    return { day: day.toString(), amount: spent };
  });

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Saldo (Semua Akun)" 
          value={formatter.format(totalBalance)} 
          icon={<Wallet className="text-blue-400" />}
          description="Total dana tersedia saat ini"
          gradient="from-blue-500/10 to-transparent"
        />
        <SummaryCard 
          title="Pemasukan Bulan Ini" 
          value={formatter.format(totalIncome)} 
          icon={<TrendingUp className="text-emerald-400" />}
          description="Total dana masuk"
          gradient="from-emerald-500/10 to-transparent"
        />
        <SummaryCard 
          title="Pengeluaran Bulan Ini" 
          value={formatter.format(totalExpense)} 
          icon={<TrendingDown className="text-rose-400" />}
          description="Total dana keluar"
          gradient="from-rose-500/10 to-transparent"
        />
        <SummaryCard 
          title="Frekuensi" 
          value={`${transactions.length} Transaksi`} 
          icon={<Activity className="text-violet-400" />}
          description="Aktivitas periode ini"
          gradient="from-violet-500/10 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Area Chart */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl relative overflow-hidden group shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400" /> Tren Pengeluaran Harian
            </CardTitle>
            <CardDescription>Visualisasi aktivitas finansial sepanjang bulan</CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="w-full h-[300px] relative">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                      labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px' }}
                      formatter={(value) => formatter.format(value as number)}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Pie Chart */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-fuchsia-400" /> Alokasi Pengeluaran
            </CardTitle>
            <CardDescription>Distribusi pengeluaran berdasarkan pos kategori</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="w-full h-[300px] relative flex items-center justify-center">
              {isMounted && pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff10', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                      itemStyle={{ color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : !isMounted ? null : (
                <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">📦</div>
                  Belum ada pengeluaran tercatat
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, description, gradient }: { title: string, value: string, icon: React.ReactNode, description: string, gradient: string }) {
  return (
    <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl group hover:bg-white/[0.04] transition-all relative overflow-hidden shadow-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
