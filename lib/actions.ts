"use server";

import { createServerSupabaseClient } from "./supabase/server";

export async function getUserContext() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getDashboardData() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return { accounts: [], categories: [], transactions: [] };
    }

    const [
        { data: accounts },
        { data: categories },
        { data: transactions }
    ] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*, account:accounts(*), category:categories(*)').eq('user_id', user.id).order('date', { ascending: false }).limit(100)
    ]);

    return { 
        accounts: accounts || [], 
        categories: categories || [], 
        transactions: transactions || [] 
    };
}

export async function createAccount(data: { name: string, type: string, balance: number, currency?: string }) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: account, error } = await supabase
        .from('accounts')
        .insert({
            user_id: user.id,
            name: data.name,
            type: data.type,
            balance: data.balance,
            currency: data.currency || 'IDR'
        })
        .select()
        .single();

    if (error) throw error;
    return account;
}

export async function createCategory(data: { name: string, type: string, icon?: string }) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: category, error } = await supabase
        .from('categories')
        .insert({
            user_id: user.id,
            name: data.name,
            type: data.type,
            icon: data.icon
        })
        .select()
        .single();

    if (error) return { error: error.message };
    return category;
}

export async function createTransaction(data: { account_id: string, category_id?: string, type: string, amount: number, date: string, description?: string }) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            account_id: data.account_id,
            category_id: data.category_id || null,
            type: data.type,
            amount: data.amount,
            date: data.date,
            description: data.description || ''
        })
        .select()
        .single();

    if (error) throw error;
    
    // Update account balance
    const { data: account } = await supabase.from('accounts').select('balance').eq('id', data.account_id).single();
    if (account) {
        const newBalance = data.type === 'income' 
            ? Number(account.balance) + Number(data.amount)
            : Number(account.balance) - Number(data.amount);
            
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', data.account_id);
    }

    return transaction;
}

export async function deleteTransaction(id: string, account_id: string, amount: number, type: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;

    // Revert account balance
    const { data: account } = await supabase.from('accounts').select('balance').eq('id', account_id).single();
    if (account) {
        const newBalance = type === 'income' 
            ? Number(account.balance) - Number(amount)
            : Number(account.balance) + Number(amount);
            
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', account_id);
    }
    
    return true;
}

export async function deleteAccount(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw error;
    return true;
}

export async function deleteCategory(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        if (error.code === '23503') {
            return { error: "Kategori tidak dapat dihapus karena sudah digunakan dalam transaksi." };
        }
        return { error: error.message };
    }
    return { success: true };
}

export async function getUserByTelegramId(chatId: string) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
        .from('user_settings')
        .select('user_id')
        .eq('telegram_chat_id', chatId)
        .single();
    return data?.user_id || null;
}

export async function linkTelegramAccount(userId: string, chatId: string) {
    const supabase = await createServerSupabaseClient();
    
    // Check if user_settings exists
    const { data: existing } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    
    if (existing) {
        await supabase.from('user_settings').update({ telegram_chat_id: chatId }).eq('user_id', userId);
    } else {
        await supabase.from('user_settings').insert({ user_id: userId, telegram_chat_id: chatId });
    }
    return true;
}

export async function getContextForAI(userId: string) {
    const supabase = await createServerSupabaseClient();
    
    const [
        { data: accounts },
        { data: categories }
    ] = await Promise.all([
        supabase.from('accounts').select('id, name, type').eq('user_id', userId).eq('is_active', true),
        supabase.from('categories').select('id, name, type').eq('user_id', userId)
    ]);

    return {
        accounts: accounts || [],
        categories: categories || []
    };
}

export async function updateCategory(id: string, data: { name: string, type: string, icon?: string }) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
        .from('categories')
        .update({
            name: data.name,
            type: data.type,
            icon: data.icon
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { success: true };
}

export async function createBudget(data: { category_id: string, amount: number, period: string, name: string }) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: budget, error } = await supabase
        .from('budgets')
        .insert({
            user_id: user.id,
            category_id: data.category_id,
            amount: data.amount,
            period: data.period,
            name: data.name
        })
        .select()
        .single();

    if (error) return { error: error.message };
    return { success: true, budget };
}

export async function updateBudget(id: string, data: { amount: number, period: string }) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
        .from('budgets')
        .update({
            amount: data.amount,
            period: data.period
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteBudget(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { success: true };
}

