import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

async function test() {
  const userId = 'cb35d215-6821-4f10-911a-1e4e5db8a8b1'; // Random UUID or we can skip DB inserts if RLS fails
  
  const parsed = {
    intent: 'create_transaction',
    type: 'expense',
    amount: 202040,
    account_id: null,
    category_id: null,
    category_name: 'Makanan Anjing',
    description: 'Beli makanan anjing'
  };
  
  let categoryId = parsed.category_id;
        
  if (!categoryId && parsed.category_name) {
    console.log("Auto creating category...");
    // Auto-create category if AI provided a name but no ID
    const { data: newCategory, error: createCatErr } = await supabaseAdmin
      .from('categories')
      .insert({ user_id: userId, name: parsed.category_name, type: parsed.type === 'income' ? 'income' : 'expense' })
      .select()
      .single();
      
    console.log("Create cat result:", newCategory, createCatErr);
    if (!createCatErr && newCategory) {
      categoryId = newCategory.id;
    }
  }

  console.log("Category ID:", categoryId);
}
test().catch(console.error);
