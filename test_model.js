require('dotenv').config({ path: '.env' });
const axios = require('axios');

const systemPrompt = `
Kamu adalah asisten keuangan personal bernama Nanalys untuk aplikasi MoneyTrack Pro.
Tugasmu adalah menganalisis pesan dari user. Kamu memiliki 2 mode (intent): "create_transaction" dan "conversational".

Data Konteks User:
- Akun yang dimiliki: BCA (ID: 1), Gopay (ID: 2)
- Kategori yang dimiliki: Makanan (ID: 1), Gaji (ID: 2)
- Waktu saat ini (Server Time): 2026-06-27T10:00:00.000Z

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

async function test() {
  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemma-4-31b-it:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "saya ingin update saldo tabungan saya saat ini 44.869.000 dan dalam saldo tersebut ada budget saya 1.5 jt" }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    const content = res.data.choices[0].message.content;
    console.log("RAW CONTENT:\n" + content);
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log("JSON PARSED:\n", JSON.parse(jsonStr));
  } catch (err) {
    console.log("ERROR:", err.message);
  }
}
test();
