export async function parseNaturalLanguage(text: string, context: any) {
  const systemPrompt = `
Kamu adalah asisten keuangan personal bernama Nanalys.
User mengirimkan pesan teks bebas untuk mencatat transaksi keuangan.
Tugasmu adalah menganalisis pesan tersebut dan mengekstrak informasi ke dalam format JSON yang terstruktur.

Data Konteks User:
- Akun yang dimiliki: ${context.accounts.map((a: any) => `${a.name} (ID: ${a.id})`).join(', ')}
- Kategori yang dimiliki: ${context.categories.map((c: any) => `${c.name} (ID: ${c.id}, Tipe: ${c.type})`).join(', ')}
- Waktu saat ini (Server Time): ${new Date().toISOString()}

Aturan:
1. "type" harus bernilai "expense", "income", atau "transfer".
2. "amount" harus berupa angka positif (number). Jika ada nominal k/jt, ubah ke angka penuh (contoh: 50k -> 50000, 2jt -> 2000000).
3. "account_id": pilih ID akun dari daftar akun di atas yang paling sesuai. Jika tidak disebutkan, gunakan akun kas/tunai, atau akun pertama.
4. "category_id": pilih ID kategori dari daftar kategori di atas yang paling sesuai (opsional, sesuaikan tipe transaksinya).
5. "description": ringkasan singkat transaksi.
6. Kembalikan HANYA JSON block murni tanpa markdown formatting (jangan gunakan backtick) atau penjelasan tambahan.

Format JSON yang diharapkan:
{
  "intent": "create_transaction",
  "type": "expense",
  "amount": 50000,
  "account_id": "uuid-account",
  "category_id": "uuid-category",
  "description": "Makan siang"
}
`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "openai/gpt-oss-120b",
        "messages": [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        "reasoning": { "enabled": true }
      })
    });

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    // Attempt to parse the content as JSON. Sometimes AI returns markdown code blocks.
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Parsing Error:", error);
    return null;
  }
}
