"use server";

import { createServerSupabaseClient } from "./supabase/server";

export async function getFamilyContext() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: membership, error } = await supabase
        .from('family_members')
        .select('*, family:families(*)')
        .eq('user_id', user.id)
        .single();

    if (error) return null;
    return membership;
}

export async function getDashboardData(familyId: string) {
    const supabase = await createServerSupabaseClient();

    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .eq('family_id', familyId);

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('family_id', familyId)
        .order('date', { ascending: false });

    return { categories: categories || [], transactions: transactions || [] };
}

export async function createFamily(name: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({ name, invite_code: inviteCode })
        .select()
        .single();

    if (familyError) throw familyError;

    const categories = [
        { family_id: family.id, name: 'Makan', icon: '🍜', budget_limit: 1000000 },
        { family_id: family.id, name: 'Transport', icon: '🚗', budget_limit: 500000 },
        { family_id: family.id, name: 'Belanja', icon: '🛍️', budget_limit: 1500000 },
        { family_id: family.id, name: 'Tagihan', icon: '💡', budget_limit: 1000000 },
        { family_id: family.id, name: 'Kesehatan', icon: '🏥', budget_limit: 500000 },
        { family_id: family.id, name: 'Lainnya', icon: '📦', budget_limit: 200000 },
    ];

    await supabase.from('categories').insert(categories);

    const { data: member, error: memberError } = await supabase
        .from('family_members')
        .insert({
            user_id: user.id,
            family_id: family.id,
            role: 'admin'
        })
        .select()
        .single();

    if (memberError) throw memberError;

    return { family, member };
}

export async function joinFamily(inviteCode: string) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: family, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

    if (familyError || !family) throw new Error("Invalid invite code");

    const { data: member, error: memberError } = await supabase
        .from('family_members')
        .insert({
            user_id: user.id,
            family_id: family.id,
            role: 'member'
        })
        .select()
        .single();

    if (memberError) throw memberError;

    return { family, member };
}
