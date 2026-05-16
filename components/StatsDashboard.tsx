"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, Target, CreditCard, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function StatsDashboard({ transactions, categories, family }: { transactions: any[], categories: any[], family: any }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const totalSpent = transactions.reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
  const familyBalance = parseFloat((family?.total_balance || 0).toString());
  const familyBudget = parseFloat((family?.total_budget || 0).toString());
  
  // Remaining Balance = Total Balance - Total Spent (for the filtered period)
  // Actually, usually balance is global, but here we want to show "Current Status"
  const currentBalance = familyBalance; // Simplified: balance is what we have in pocket
  
  const budgetUsagePercent = familyBudget > 0 ? (totalSpent / familyBudget) * 100 : 0;
  const isOverBudget = totalSpent > familyBudget;

  // Data for Pie Chart
  const pieData = categories.map(cat => {
    const spent = transactions
      .filter(t => t.category_id === cat.id)
      .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
    return { name: cat.name, value: spent };
  }).filter(d => d.value > 0);

  // Data for Area Chart (Day-wise spending)
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const spent = transactions
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
          title="Saldo Utama" 
          value={formatter.format(currentBalance)} 
          icon={<Wallet className="text-emerald-400" />}
          description="Total dana tersedia saat ini"
          gradient="from-emerald-500/10 to-transparent"
        />
        <SummaryCard 
          title="Total Pengeluaran" 
          value={formatter.format(totalSpent)} 
          icon={<TrendingUp className="text-rose-400" />}
          description={`${budgetUsagePercent.toFixed(1)}% dari budget`}
          gradient="from-rose-500/10 to-transparent"
        />
        <SummaryCard 
          title="Sisa Budget" 
          value={formatter.format(Math.max(0, familyBudget - totalSpent))} 
          icon={<Target className="text-violet-400" />}
          description={`Goal: ${formatter.format(familyBudget)}`}
          gradient="from-violet-500/10 to-transparent"
        />
        <SummaryCard 
          title="Frekuensi" 
          value={`${transactions.length} Transaksi`} 
          icon={<Activity className="text-sky-400" />}
          description="Aktivitas periode ini"
          gradient="from-sky-500/10 to-transparent"
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
              <TrendingDown className="w-5 h-5 text-fuchsia-400" /> Alokasi Kategori
            </CardTitle>
            <CardDescription>Distribusi pengeluaran berdasarkan pos anggaran</CardDescription>
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

        {/* Category Progress Bars */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl lg:col-span-2 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Budget Monitor</CardTitle>
            <CardDescription>Detail penggunaan anggaran per kategori untuk periode terpilih</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map(cat => {
                const spent = transactions
                  .filter(t => t.category_id === cat.id)
                  .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
                const limit = parseFloat((cat.budget_limit || 0).toString());
                const percent = limit > 0 ? Math.min(100, (spent / limit) * 100) : (spent > 0 ? 100 : 0);
                const isOver = spent > limit && limit > 0;

                return (
                  <div key={cat.id} className="group p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all hover:translate-y-[-2px]">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl">
                          {cat.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{cat.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Kategori</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isOver ? 'text-rose-400' : 'text-white'}`}>
                          {formatter.format(spent)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Limit: {formatter.format(limit)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-violet-500 to-violet-400'}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isOver ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {isOver ? `Over budget ${formatter.format(spent - limit)}` : `${(100 - percent).toFixed(0)}% sisa`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{percent.toFixed(0)}% terpakai</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
