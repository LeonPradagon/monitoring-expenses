import axios from 'axios';

export async function parseNaturalLanguage(text: string, context: any) {
  const systemPrompt = `
Kamu adalah Nanalys, asisten keuangan personal dan konsultan finansial profesional untuk aplikasi MoneyTrack Pro.
Tugasmu adalah menganalisis pesan dari user dengan sopan, rapi, dan terstruktur.

Data Konteks User:
- Akun yang dimiliki: ${context.accounts.map((a: any) => `${a.name} (ID: ${a.id})`).join(', ')}
- Kategori yang dimiliki: ${context.categories.map((c: any) => `${c.name} (ID: ${c.id}, Tipe: ${c.type})`).join(', ')}
- Waktu saat ini: ${new Date().toISOString()}

ATURAN MODE "create_transaction":
Jika user memberikan instruksi mencatat pengeluaran, pemasukan, atau transfer dengan nominal:
1. "intent" harus "create_transaction".
2. "type" harus "expense", "income", atau "transfer".
3. "amount" berupa angka positif murni (contoh: 50k -> 50000).
4. "account_id": pilih ID akun dari daftar yang paling sesuai. (Kosongkan jika user tidak menyebutkan).
5. "category_id": pilih ID kategori yang paling sesuai dari data. Cerdaslah mencocokkan kata (misal: "makan" -> "Makanan"). Kosongkan jika benar-benar tidak ada.
6. "category_name": Tulis nama kategori yang disebutkan user secara rapi. Wajib diisi jika category_id kosong.
7. "description": ringkasan singkat.

ATURAN MODE "update_balance":
Jika user meminta untuk memperbarui, mengubah, atau menyamakan saldo akhir suatu akun:
1. "intent" harus "update_balance".
2. "amount" berupa target saldo akhir.
3. "account_id": pilih ID akun yang dimaksud.

ATURAN MODE "create_account":
Jika user meminta untuk membuat atau menambahkan akun keuangan baru:
1. "intent" harus "create_account".
2. "name" nama akun (contoh: "BCA").
3. "type" pilih: "bank", "ewallet", "cash".
4. "balance" berupa angka saldo awal.

ATURAN MODE "set_budget":
Jika user meminta untuk mengatur, membuat, atau mengubah budget:
1. "intent" harus "set_budget".
2. "category_id": pilih ID kategori yang relevan.
3. "category_name": Tulis nama kategori jika category_id kosong.
4. "amount": nominal budget.
5. "period": "monthly".

ATURAN MODE "check_balance":
Jika user menanyakan berapa saldo / sisa uang mereka:
1. "intent" harus "check_balance".
2. "account_name": nama akun yang ditanyakan (contoh: "BCA"). Kosongkan jika menanyakan total keseluruhan.

ATURAN MODE "check_budget":
Jika user menanyakan berapa sisa budget / anggaran mereka:
1. "intent" harus "check_budget".
2. "category_name": nama kategori yang ditanyakan (contoh: "Makanan"). Kosongkan jika menanyakan keseluruhan.

ATURAN MODE "conversational":
Jika pesan user berupa sapaan, pertanyaan keuangan, atau konsultasi finansial di luar perintah teknis:
1. "intent" harus "conversational".
2. "response_message": balasanmu yang ramah dan suportif (Gunakan formatting HTML seperti <b> atau <i> jika perlu).

CONTOH JSON:
{"intent": "check_balance", "account_name": "BCA"}
{"intent": "check_budget", "category_name": "Makanan"}
{"intent": "conversational", "response_message": "Halo! Ada transaksi yang mau dicatat?"}

IMPORTANT: OUTPUT ONLY THE JSON OBJECT. DO NOT OUTPUT ANY THOUGHT PROCESS OR EXPLANATION. DO NOT USE MARKDOWN FORMATTING.
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nPESAN USER:\n${text}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const result = response.data;
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      return { intent: "error", message: "Maaf, Gemini API tidak mengembalikan balasan apa-apa." };
    }
    
    // Extract JSON block in case model outputs extra text
    let jsonStr = "";
    
    // 1. Try markdown code block
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if (codeBlockMatch) {
      try { return JSON.parse(codeBlockMatch[1]); } catch (e) {}
    }
    
    // 2. Try first { to last }
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      try { return JSON.parse(content.substring(firstBrace, lastBrace + 1)); } catch (e) {}
    }
    
    // 3. Fallback: match any { ... } non-greedily and try to parse the last valid one
    const matches = content.match(/\{[\s\S]*?\}/g);
    if (matches) {
       for (let i = matches.length - 1; i >= 0; i--) {
          try { return JSON.parse(matches[i]); } catch (e) {}
       }
    }
    
    throw new Error("No valid JSON found in AI response");
    
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error("AI Parsing Error (Gemini):", errorData);
    
    return { intent: "error", message: "Maaf, terjadi gangguan pada sistem AI Nanalys (Gemini API Error)." };
  }
}
