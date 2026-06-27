"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Budget {
  id: string;
  category_id: string;
  name: string;
  amount: number;
  spent: number;
}

export default function BudgetWidget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBudgets() {
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
    }

    fetchBudgets();
  }, [supabase]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  if (budgets.length === 0) {
    return null; // Don't show anything if no budgets are set
  }

  const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Budget Bulanan</h3>
      </div>
      
      <div className="space-y-6">
        {budgets.map((budget) => {
          const percentage = Math.min((budget.spent / budget.amount) * 100, 100);
          
          // Determine color based on percentage
          let progressColor = "bg-green-500";
          if (percentage > 90) progressColor = "bg-red-500";
          else if (percentage > 75) progressColor = "bg-yellow-500";

          return (
            <div key={budget.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{budget.name}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatter.format(budget.spent)} / {formatter.format(budget.amount)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full ${progressColor} transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              {percentage > 90 && (
                <p className="text-xs text-red-500 font-medium text-right">⚠️ Hampir habis!</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
