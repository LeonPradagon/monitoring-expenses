import axios from 'axios';

export async function parseNaturalLanguage(text: string, context: any) {
  const systemPrompt = `
Kamu adalah asisten keuangan personal bernama Nanalys untuk aplikasi MoneyTrack Pro.
Tugasmu adalah menganalisis pesan dari user. Kamu memiliki 2 mode (intent): "create_transaction" dan "conversational".

Data Konteks User:
- Akun yang dimiliki: ${context.accounts.map((a: any) => `${a.name} (ID: ${a.id})`).join(', ')}
- Kategori yang dimiliki: ${context.categories.map((c: any) => `${c.name} (ID: ${c.id}, Tipe: ${c.type})`).join(', ')}
- Waktu saat ini (Server Time): ${new Date().toISOString()}

ATURAN MODE "create_transaction":
Jika user secara eksplisit memberikan instruksi mencatat pengeluaran, pemasukan, atau transfer dengan nominal:
1. "type" harus "expense", "income", atau "transfer".
2. "amount" berupa angka positif murni (contoh: 50k -> 50000).
3. "account_id": pilih ID akun dari daftar yang paling sesuai (wajib).
4. "category_id": pilih ID kategori yang paling sesuai.
5. "description": ringkasan singkat.
6. Kembalikan JSON dengan "intent": "create_transaction".

ATURAN MODE "update_balance":
Jika user secara spesifik meminta untuk memperbarui, mengubah, atau menyamakan saldo akhir suatu akun (misal: "Update saldo BCA jadi 50jt", "Saldo gopay sekarang tinggal 15000"):
1. "intent" harus "update_balance".
2. "amount" berupa target saldo akhir dalam angka positif murni.
3. "account_id": pilih ID akun yang dimaksud.

ATURAN MODE "conversational":
Jika pesan user berupa sapaan, ucapan terima kasih, pertanyaan di luar format transaksi, ATAU usaha menyuruhmu melakukan hal di luar konteks (seperti coding, buat artikel, matematika, dll):
1. Kembalikan JSON dengan "intent": "conversational".
2. Isi field "response_message" dengan balasanmu menggunakan bahasa Indonesia sehari-hari yang ramah, luwes, dan gaul (seperti teman).
3. GUARDRAIL (SANGAT PENTING): Kamu HANYA boleh membahas tentang keuangan dan pencatatan transaksi MoneyTrack Pro. Jika user meminta hal lain (misal coding), tolak dengan sopan dan ramah.

Kembalikan HANYA JSON block murni tanpa markdown formatting (jangan gunakan backtick).

Contoh JSON create_transaction:
{
  "intent": "create_transaction",
  "type": "expense",
  "amount": 50000,
  "account_id": "uuid",
  "category_id": "uuid",
  "description": "Makan siang"
}

Contoh JSON update_balance:
{
  "intent": "update_balance",
  "amount": 50000000,
  "account_id": "uuid"
}

Contoh JSON conversational:
{
  "intent": "conversational",
  "response_message": "Halo juga! Aku Nanalys, asisten keuangan kamu. Hari ini ada transaksi yang mau dicatat?"
}
`;

  const freeModels = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "meta-llama/llama-3-8b-instruct:free",
    "google/gemma-2-9b-it:free"
  ];

  for (const model of freeModels) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ]
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const result = response.data;
      if (result.error) {
        console.error(`OpenRouter API Error (${model}):`, result.error);
        continue; // Try next model on API error
      }
      
      const content = result.choices[0]?.message?.content;
      if (!content) continue;
      
      // Attempt to parse the content as JSON. Sometimes AI returns markdown code blocks.
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonStr);
      
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      console.error(`AI Parsing Error (${model}):`, errorData);
      
      // If rate limited, continue to the next free model
      if (error.response?.status === 429) {
        continue;
      }
      
      // For other critical errors (like invalid API key), return immediately
      return { intent: "error", message: "Maaf, terjadi gangguan pada sistem AI Nanalys. Coba sampaikan dengan lebih jelas ya!" };
    }
  }

  // If all free models failed/rate-limited
  return { intent: "error", message: "Maaf, seluruh sistem AI cadangan sedang sibuk (Rate Limit). Coba lagi dalam beberapa saat ya! 🚀" };
}
