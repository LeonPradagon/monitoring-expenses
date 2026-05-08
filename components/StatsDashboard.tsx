"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet, Target, CreditCard } from "lucide-react";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F"];

export function StatsDashboard({ transactions, categories, family }: { transactions: any[], categories: any[], family: any }) {
  const totalSpent = transactions.reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
  const totalCategoryBudget = categories.reduce((sum, c) => sum + parseFloat((c.budget_limit || 0).toString()), 0);
  const familyBalance = parseFloat((family?.total_balance || 0).toString());
  const familyBudget = parseFloat((family?.total_budget || 0).toString());
  
  // Remaining Balance = Total Balance - Total Spent
  const currentBalance = Math.max(0, familyBalance - totalSpent);
  
  // Progress against family budget goal
  const budgetUsagePercent = familyBudget > 0 ? (totalSpent / familyBudget) * 100 : 0;

  // Data for Pie Chart
  const pieData = categories.map(cat => {
    const spent = transactions
      .filter(t => t.category_id === cat.id)
      .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
    return { name: cat.name, value: spent };
  }).filter(d => d.value > 0);

  // Data for Line Chart (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const lineData = last7Days.map(date => {
    const spent = transactions
      .filter(t => t.date.startsWith(date))
      .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
    return { date: date.split('-').slice(1).join('/'), amount: spent };
  });


  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard 
          title="Saldo Tersedia" 
          value={formatter.format(currentBalance)} 
          icon={<Wallet className="text-emerald-500" />}
          trend={`Dari total Rp${(familyBalance/1000000).toFixed(1)}jt`}
        />
        <SummaryCard 
          title="Total Terpakai" 
          value={formatter.format(totalSpent)} 
          icon={<ArrowUpRight className="text-rose-500" />}
          trend={`${budgetUsagePercent.toFixed(1)}% dari goal budget`}
        />
        <SummaryCard 
          title="Sisa Budget (Goal)" 
          value={formatter.format(Math.max(0, familyBudget - totalSpent))} 
          icon={<Target className="text-primary" />}
          trend={`Goal: ${formatter.format(familyBudget)}`}
        />
        <SummaryCard 
          title="Transaksi" 
          value={transactions.length.toString()} 
          icon={<CreditCard className="text-sky-400" />}
          trend="Bulan ini"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Breakdown Pie Chart */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Pengeluaran per Kategori</CardTitle>
            <CardDescription>Breakdown pengeluaran berdasarkan kategori</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data kategori
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend Line Chart */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tren 7 Hari Terakhir</CardTitle>
            <CardDescription>Visualisasi pengeluaran harian</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={4} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Progress Bars */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Budget per Kategori</CardTitle>
            <CardDescription>Monitoring penggunaan budget setiap kategori</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map(cat => {
                const spent = transactions
                  .filter(t => t.category_id === cat.id)
                  .reduce((sum, t) => sum + parseFloat((t.amount || 0).toString()), 0);
                const limit = parseFloat((cat.budget_limit || 0).toString());
                const percent = Math.min(100, (spent / (limit || 1)) * 100);
                const isOver = spent > limit;

                return (
                  <div key={cat.id} className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="font-medium text-white">{cat.name}</span>
                      </div>
                      <span className={isOver ? "text-rose-500 font-bold" : "text-muted-foreground"}>
                        {formatter.format(spent)} / {formatter.format(limit)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : 'bg-primary'}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOver ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {isOver ? `Over budget by ${formatter.format(spent - limit)}` : `${(100 - percent).toFixed(0)}% sisa`}
                      </span>
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

function SummaryCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm group hover:bg-white/[0.04] transition-all">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
