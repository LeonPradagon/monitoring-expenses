require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function parseNaturalLanguage(text, context) {
  const systemPrompt = `
Kamu adalah Nanalys, asisten keuangan personal dan konsultan finansial profesional untuk aplikasi MoneyTrack Pro.

Data Konteks User:
- Akun yang dimiliki: ${context.accounts.map(a => `${a.name} (ID: ${a.id})`).join(', ')}
- Kategori yang dimiliki: ${context.categories.map(c => `${c.name} (ID: ${c.id})`).join(', ')}

ATURAN MODE "create_transaction":
Jika user memberikan instruksi mencatat pengeluaran, pemasukan, atau transfer dengan nominal:
1. "intent" harus "create_transaction".
2. "type" harus "expense", "income", atau "transfer".
3. "amount" berupa angka positif murni (contoh: 50k -> 50000).
4. "account_id": pilih ID akun dari daftar yang paling sesuai. (Kosongkan jika user tidak menyebutkan).
5. "category_id": pilih ID kategori yang paling sesuai.
6. "category_name": Tulis nama kategori yang disebutkan user. Wajib diisi jika category_id kosong.
7. "description": ringkasan singkat.

Kembalikan HANYA JSON block murni.
`;

  try {
    const result = await model.generateContent([
      systemPrompt,
      { text: `Pesan User: "${text}"` }
    ]);
    
    let textResult = result.response.text();
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(textResult);
  } catch (error) {
    console.error("AI Parse Error:", error);
    return null;
  }
}

parseNaturalLanguage("saya ada beli makanan anjing 202.040", { accounts: [{name: 'BCA', id: '123'}], categories: [{name: 'Makanan', id: 'abc'}] }).then(console.log);
