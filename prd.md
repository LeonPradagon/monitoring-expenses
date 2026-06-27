# Brainstorming: Aplikasi Pencatat Keuangan Personal

> Dokumen ini merangkum hasil brainstorming lengkap untuk pembangunan aplikasi pencatat keuangan personal berbasis web dengan fitur AI interaktif, bot Telegram, dan export Excel.

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Tech Stack & Infrastruktur](#2-tech-stack--infrastruktur)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Desain Database (Supabase)](#4-desain-database-supabase)
5. [Modul Fitur Detail](#5-modul-fitur-detail)
6. [Fitur AI Interaktif](#6-fitur-ai-interaktif)
7. [Bot Telegram](#7-bot-telegram)
8. [Export Excel (Template Menarik)](#8-export-excel-template-menarik)
9. [Notifikasi & Email](#9-notifikasi--email)
10. [Struktur Folder Proyek](#10-struktur-folder-proyek)
11. [Prioritas MVP & Roadmap](#11-prioritas-mvp--roadmap)
12. [Keputusan Desain Penting](#12-keputusan-desain-penting)

---

## 1. Ringkasan Proyek

### Visi

Aplikasi pencatat keuangan personal dengan kualitas setara ERP, dilengkapi AI interaktif yang bisa menjawab semua pertanyaan terkait kondisi keuangan user, bot Telegram untuk input cepat, dan laporan Excel yang profesional dan menarik.

### Scope (Personal)

- Single user (diri sendiri)
- Multi-akun (kas, bank, e-wallet, investasi)
- Multi-currency dengan konversi otomatis
- Data disimpan di cloud (Supabase) — akses dari mana saja

### Batasan Teknis yang Disepakati

| Keputusan       | Pilihan                                      |
| --------------- | -------------------------------------------- |
| Scope user      | Personal (single user)                       |
| Bot model       | Satu bot Telegram, identifikasi via `chatId` |
| AI granularitas | Chat interaktif penuh (streaming response)   |
| Template Excel  | Desain profesional & menarik                 |
| Deploy          | Vercel (Next.js)                             |

---

## 2. Tech Stack & Infrastruktur

### Frontend

| Layer         | Teknologi                    | Alasan                                                 |
| ------------- | ---------------------------- | ------------------------------------------------------ |
| Framework     | **Next.js 14+ (App Router)** | SSR, API Routes, file-based routing                    |
| Styling       | **Tailwind CSS**             | Utility-first, cepat untuk dev                         |
| UI Components | **shadcn/ui**                | Accessible, customizable, tidak opinionated            |
| Charts        | **Recharts**                 | Flexible, React-native, ringan                         |
| Form          | **React Hook Form + Zod**    | Validation type-safe                                   |
| State         | **Zustand**                  | Ringan, tidak boilerplate                              |
| Date          | **date-fns**                 | Lightweight date manipulation                          |
| Currency      | **dinero.js**                | Presisi aritmatika keuangan (menghindari float errors) |

### Backend

| Layer     | Teknologi                 | Alasan                                 |
| --------- | ------------------------- | -------------------------------------- |
| API       | **Next.js API Routes**    | Sudah dalam satu project               |
| Database  | **Supabase (PostgreSQL)** | Realtime, Auth, Storage built-in       |
| Auth      | **Supabase Auth**         | Magic link / Google OAuth              |
| Storage   | **Supabase Storage**      | Untuk attachment bukti transaksi       |
| Job Queue | **Vercel Cron Jobs**      | Scheduled export, reminder             |
| Email     | **Resend**                | Developer-friendly, generous free tier |

### AI & Bot

| Layer        | Teknologi                          | Alasan                                     |
| ------------ | ---------------------------------- | ------------------------------------------ |
| AI Model     | **OpenRouter (contoh: openai/gpt-oss-120b)**| Mendukung kapabilitas reasoning dan banyak pilihan model |
| AI API       | **Fetch API (Native)**             | Akses langsung endpoint dengan reasoning details |
| Bot Telegram | **Grammy.js**                      | Modern, TypeScript-first, Telegram Bot API |
| Bot Deploy   | **Webhook di Vercel**              | Serverless, tidak perlu server terpisah    |

### Export & Laporan

| Layer | Teknologi                           | Alasan                                |
| ----- | ----------------------------------- | ------------------------------------- |
| Excel | **ExcelJS**                         | Styling lengkap, formula, chart       |
| PDF   | **Puppeteer / @react-pdf/renderer** | Render HTML ke PDF atau PDF via React |

### Deploy

| Layer       | Teknologi                                   |
| ----------- | ------------------------------------------- |
| Hosting     | **Vercel**                                  |
| Database    | **Supabase (cloud)**                        |
| Domain      | Custom domain via Vercel                    |
| Environment | `.env.local` → Vercel Environment Variables |

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER                                    │
│              (Browser / Telegram / Email)                        │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
┌─────────────────────┐      ┌─────────────────────────┐
│    Web App          │      │    Telegram Bot          │
│    Next.js          │      │    (Grammy.js)           │
│    Vercel           │      │    Webhook API Route     │
└──────────┬──────────┘      └────────────┬────────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │     Next.js API Routes       │
           │  /api/transactions           │
           │  /api/ai/chat                │
           │  /api/bot/webhook            │
           │  /api/export                 │
           │  /api/reports                │
           └──────┬──────────────┬────────┘
                  │              │
         ┌────────▼──┐    ┌──────▼──────────┐
         │ Supabase  │    │ OpenRouter API  │
         │ PostgreSQL│    │ (AI Engine)      │
         │ Auth      │    │ Reasoning Model  │
         │ Storage   │    └─────────────────┘
         └────────┬──┘
                  │
         ┌────────▼──────────────────────┐
         │         OUTPUT                │
         │  Excel (.xlsx) via ExcelJS    │
         │  PDF via Puppeteer            │
         │  Email via Resend             │
         │  Telegram message/document    │
         └───────────────────────────────┘
```

### Alur Data Utama

**Input Transaksi (Web):**

```
User form → Zod validation → API Route → Supabase insert
                                       → AI auto-kategorisasi (background)
                                       → Update dashboard realtime
```

**Input via Telegram:**

```
User kirim pesan → Telegram → Webhook /api/bot/webhook
                            → Parse intent (Grammy middleware)
                            → Simpan ke Supabase
                            → Reply konfirmasi ke user
```

**AI Chat:**

```
User tanya → /api/ai/chat → Ambil konteks data (Supabase)
                          → Kirim ke OpenRouter API (dengan reasoning)
                          → Kembalikan response (termasuk reasoning_details)
                          → Tampil di UI chat
```

**Export Excel:**

```
User request → /api/export → Query Supabase (filter by date/category)
                           → ExcelJS generate file
                           → Option: download / kirim email / kirim Telegram
```

---

## 4. Desain Database (Supabase)

### Tabel Utama

#### `accounts` — Daftar akun keuangan

```sql
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,                    -- "BCA Tabungan", "Kas Dompet"
  type        TEXT NOT NULL,                    -- bank | cash | ewallet | investment | credit
  currency    TEXT NOT NULL DEFAULT 'IDR',
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
  color       TEXT,                             -- Hex color untuk UI
  icon        TEXT,                             -- Icon identifier
  is_active   BOOLEAN DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `categories` — Kategori transaksi

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),   -- NULL = kategori default sistem
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,                    -- income | expense | transfer
  parent_id   UUID REFERENCES categories(id),  -- Sub-kategori
  color       TEXT,
  icon        TEXT,
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `transactions` — Transaksi utama

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  account_id      UUID NOT NULL REFERENCES accounts(id),
  category_id     UUID REFERENCES categories(id),
  type            TEXT NOT NULL,                -- income | expense | transfer
  amount          NUMERIC(18,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'IDR',
  amount_idr      NUMERIC(18,2),               -- Konversi ke IDR untuk laporan
  exchange_rate   NUMERIC(10,6) DEFAULT 1,
  description     TEXT,
  notes           TEXT,
  tags            TEXT[],                       -- Array tags bebas
  date            DATE NOT NULL,
  time            TIME,
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurring_id    UUID,                         -- Link ke recurring_schedules
  reference_no    TEXT,                         -- No. referensi / nota
  location        TEXT,
  merchant        TEXT,                         -- Nama merchant/toko
  is_transfer     BOOLEAN DEFAULT FALSE,
  transfer_to     UUID REFERENCES accounts(id), -- Jika transfer antar akun
  attachments     TEXT[],                       -- Array URL Supabase Storage
  ai_categorized  BOOLEAN DEFAULT FALSE,        -- Apakah dikategorisasi AI
  source          TEXT DEFAULT 'web',           -- web | telegram | import | api
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index penting
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
```

#### `budgets` — Anggaran per kategori

```sql
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  category_id   UUID REFERENCES categories(id),
  name          TEXT NOT NULL,
  amount        NUMERIC(18,2) NOT NULL,
  period        TEXT NOT NULL,             -- monthly | weekly | yearly | custom
  start_date    DATE,
  end_date      DATE,
  alert_at      NUMERIC(5,2) DEFAULT 80,  -- Alert saat 80% budget
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `recurring_schedules` — Transaksi berulang

```sql
CREATE TABLE recurring_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  account_id    UUID NOT NULL REFERENCES accounts(id),
  category_id   UUID REFERENCES categories(id),
  type          TEXT NOT NULL,
  amount        NUMERIC(18,2) NOT NULL,
  description   TEXT,
  frequency     TEXT NOT NULL,           -- daily | weekly | monthly | yearly
  interval      INTEGER DEFAULT 1,       -- Setiap N frekuensi
  day_of_month  INTEGER,                 -- Untuk monthly: tanggal berapa
  day_of_week   INTEGER,                 -- Untuk weekly: hari ke berapa
  start_date    DATE NOT NULL,
  end_date      DATE,
  last_run      DATE,
  next_run      DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `debts` — Hutang & piutang

```sql
CREATE TABLE debts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  type          TEXT NOT NULL,           -- debt (hutang) | receivable (piutang)
  contact_name  TEXT NOT NULL,
  amount        NUMERIC(18,2) NOT NULL,
  remaining     NUMERIC(18,2) NOT NULL,
  currency      TEXT DEFAULT 'IDR',
  description   TEXT,
  due_date      DATE,
  interest_rate NUMERIC(5,2) DEFAULT 0,
  status        TEXT DEFAULT 'active',   -- active | partial | paid
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `debt_payments` — Cicilan hutang

```sql
CREATE TABLE debt_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id       UUID NOT NULL REFERENCES debts(id),
  transaction_id UUID REFERENCES transactions(id),
  amount        NUMERIC(18,2) NOT NULL,
  date          DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_settings` — Preferensi user

```sql
CREATE TABLE user_settings (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id),
  telegram_chat_id  TEXT UNIQUE,         -- Untuk bot Telegram
  base_currency     TEXT DEFAULT 'IDR',
  timezone          TEXT DEFAULT 'Asia/Jakarta',
  date_format       TEXT DEFAULT 'DD/MM/YYYY',
  report_day        INTEGER DEFAULT 1,   -- Hari laporan bulanan dikirim
  notify_budget     BOOLEAN DEFAULT TRUE,
  notify_recurring  BOOLEAN DEFAULT TRUE,
  notify_report     TEXT DEFAULT 'weekly', -- off | daily | weekly | monthly
  report_email      TEXT,
  ai_context_months INTEGER DEFAULT 3,   -- Berapa bulan data dikirim ke AI
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

#### `ai_conversations` — Riwayat chat AI

```sql
CREATE TABLE ai_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  messages    JSONB NOT NULL DEFAULT '[]', -- Array of {role, content, timestamp}
  title       TEXT,                        -- Auto-generated dari pesan pertama
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

Karena personal app, RLS cukup sederhana — semua tabel dilindungi per `user_id`:

```sql
-- Contoh untuk tabel transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can only access own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Berlaku sama untuk: accounts, categories, budgets, debts, recurring_schedules
```

### Views Berguna

```sql
-- View ringkasan saldo semua akun
CREATE VIEW account_balances AS
SELECT
  a.id,
  a.name,
  a.type,
  a.currency,
  a.balance,
  a.color,
  a.icon,
  COUNT(t.id) AS transaction_count,
  MAX(t.date) AS last_transaction_date
FROM accounts a
LEFT JOIN transactions t ON a.id = t.account_id
WHERE a.is_active = TRUE
GROUP BY a.id;

-- View transaksi bulanan dengan kategori
CREATE VIEW monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', date) AS month,
  type,
  category_id,
  SUM(amount_idr) AS total,
  COUNT(*) AS count
FROM transactions
GROUP BY user_id, month, type, category_id;
```

---

## 5. Modul Fitur Detail

### 5.1 Manajemen Transaksi

**Input Transaksi:**

- Form cepat (quick entry) di header: amount, kategori, akun, deskripsi
- Form lengkap: semua field termasuk merchant, lokasi, no. referensi, tags, attachment
- Input dari Telegram: natural language parsing via AI
- Import CSV/Excel dari mutasi bank

**Tampilan Daftar Transaksi:**

- Table view dengan filter multi-dimensi: tanggal, kategori, akun, jumlah, tags
- Search full-text di deskripsi & merchant
- Sort by semua kolom
- Bulk edit/delete
- Inline edit untuk koreksi cepat
- Pagination dengan infinite scroll

**Detail Transaksi:**

- Modal atau halaman detail
- Preview attachment
- Edit history (siapa/kapan yang edit)
- Terkait ke: hutang, recurring, budget mana

### 5.2 Dashboard

**KPI Cards (Real-time):**

- Total saldo semua akun
- Pemasukan bulan ini
- Pengeluaran bulan ini
- Net cashflow bulan ini
- Budget usage (%)
- Hutang outstanding

**Grafik:**

- Area chart cashflow 30 hari terakhir
- Donut chart pengeluaran per kategori (bulan ini)
- Bar chart perbandingan income vs expense 6 bulan
- Line chart tren kategori utama
- Progress bar budget per kategori

**Widget Cepat:**

- Transaksi terakhir (5 items)
- Tagihan jatuh tempo minggu ini
- Budget yang hampir habis
- Upcoming recurring transactions

### 5.3 Anggaran (Budget)

- Buat budget per kategori atau grup kategori
- Periode: bulanan, mingguan, tahunan, atau custom
- Alert threshold custom (default 80%)
- Visualisasi: progress bar + sisa + proyeksi
- Rollover: sisa budget bulan lalu dibawa ke bulan berikut (opsional)
- Budget history: lihat realisasi budget bulan-bulan sebelumnya

### 5.4 Hutang & Piutang

- Input hutang baru: siapa, berapa, kapan jatuh tempo, bunga (opsional)
- Input piutang: uang yang dipinjamkan ke orang lain
- Catat cicilan/pembayaran (otomatis link ke transaksi)
- Status: belum bayar / sebagian / lunas
- Reminder otomatis H-7, H-3, H-1 jatuh tempo (via Telegram/Email)
- Laporan aging (hutang > 30 hari, > 60 hari, > 90 hari)

### 5.5 Recurring Transactions

- Setup transaksi berulang: gaji, sewa, langganan, cicilan
- Frekuensi: harian, mingguan, bulanan, tahunan
- Notifikasi sebelum jatuh tempo
- Konfirmasi manual sebelum auto-post (opsional)
- Edit one-time vs edit semua

### 5.6 Multi-Akun & Transfer

- Tipe akun: Kas, Bank, E-Wallet (GoPay, OVO, Dana), Investasi, Kartu Kredit
- Saldo awal saat setup
- Transfer antar akun: catat sebagai expense dari akun A + income ke akun B
- Rekonsiliasi: bandingkan saldo sistem vs saldo aktual bank

---

## 6. Fitur AI Interaktif

### Konsep

AI assistant yang bisa menjawab **semua pertanyaan terkait keuangan personal** dengan konteks data transaksi nyata user. Bukan AI generik — AI yang "mengenal" kondisi keuangan user.

### Contoh Pertanyaan yang Bisa Dijawab

**Analisis:**

- "Berapa total pengeluaran saya bulan ini dibanding bulan lalu?"
- "Kategori apa yang paling banyak saya belanjakan?"
- "Apakah saya on track dengan budget makanan bulan ini?"
- "Tunjukkan tren pengeluaran saya 3 bulan terakhir"

**Prediksi & Saran:**

- "Kalau pola pengeluaran saya seperti ini, berapa sisa bulan ini?"
- "Di mana saya bisa hemat paling besar?"
- "Kapan saya bisa melunasi hutang ke Budi?"
- "Berapa dana darurat ideal saya berdasarkan pengeluaran?"

**Action:**

- "Catat pengeluaran makan siang 45 ribu dari BCA"
- "Buat budget transportasi 500 ribu untuk bulan ini"
- "Tampilkan semua transaksi GoPay minggu lalu"
- "Export laporan bulan ini dan kirim ke email"

**Natural Language:**

- "Gue udah abis berapa sih bulan ini?"
- "Pengeluaran gue gila banget hari ini, beneran?"
- "Summary keuangan gue bulan Oktober dong"

### Implementasi Teknis

**System Prompt dengan Konteks Data:**

```
Kamu adalah asisten keuangan personal yang cerdas dan membantu.
Kamu memiliki akses ke data keuangan user berikut:

[KONTEKS DATA - di-inject saat runtime]
- Tanggal sekarang: {today}
- Total saldo: {total_balance} ({breakdown per akun})
- Pemasukan bulan ini: {income_this_month}
- Pengeluaran bulan ini: {expense_this_month}
- Budget usage: {budget_summary}
- 20 transaksi terakhir: {recent_transactions}
- Hutang outstanding: {debts_summary}
- Top kategori bulan ini: {top_categories}

Kamu bisa:
1. Menjawab pertanyaan analisis keuangan berdasarkan data di atas
2. Memberikan saran & insight finansial yang actionable
3. Mengeksekusi aksi: catat transaksi, buat budget, dll (return structured JSON)
4. Meminta data tambahan jika diperlukan (mis: data 6 bulan untuk trend)

Gunakan bahasa yang sama dengan user (Indonesia/English).
Jawab dengan natural, friendly tapi tetap akurat dan based on data.
Jika ada action yang perlu dieksekusi, sertakan JSON action di akhir response.
```

**Integrasi OpenRouter dengan Reasoning (Native Fetch):**

```typescript
// app/api/ai/chat/route.ts
export async function POST(req: Request) {
  const { messages, conversationId } = await req.json();

  // Ambil konteks keuangan user dari Supabase
  const context = await getFinancialContext(userId);
  
  // Format pesan termasuk system prompt
  const fullMessages = [
    { role: "system", content: buildSystemPrompt(context) },
    ...messages
  ];

  // API call ke OpenRouter dengan mengaktifkan reasoning
  let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "openai/gpt-oss-120b",
      "messages": fullMessages,
      "reasoning": { "enabled": true }
    })
  });

  const result = await response.json();
  const assistantMessage = result.choices[0].message;

  // Simpan percakapan ke Supabase 
  // PENTING: sertakan reasoning_details untuk pemanggilan berikutnya jika user membalas
  await saveConversation(conversationId, fullMessages, assistantMessage);

  // Parse dan eksekusi action jika ada
  const action = parseAction(assistantMessage.content);
  if (action) await executeAction(action, userId);

  // Return data ke client
  return Response.json({
    message: assistantMessage.content,
    reasoning_details: assistantMessage.reasoning_details
  });
}
```

**Konteks Data yang Dikirim ke AI:**

- Ringkasan saldo (tidak kirim semua detail, cukup summary)
- Budget status (kategori + usage %)
- N transaksi terakhir (default 30 transaksi)
- Hutang outstanding
- Untuk pertanyaan trend: ambil data 3-6 bulan terakhir
- Sesuaikan `ai_context_months` dari `user_settings`

**Action Execution (AI bisa trigger aksi):**

```typescript
// Contoh response AI dengan action
// "Oke, saya catat pengeluaran makan 45 ribu dari BCA ya."
// <ACTION>{"type":"create_transaction","data":{"amount":45000,"type":"expense","category":"Food","account":"BCA","description":"Makan siang"}}</ACTION>

function parseAction(text: string) {
  const match = text.match(/<ACTION>(.*?)<\/ACTION>/s);
  if (!match) return null;
  return JSON.parse(match[1]);
}
```

**UI Chat:**

- Chat interface di sidebar atau halaman tersendiri
- Streaming response (karakter muncul satu-satu)
- Markdown rendering untuk response AI
- Quick prompts / suggestions
- History percakapan tersimpan
- Copy response button
- Tombol "Tanya AI" bisa diakses dari mana saja di app

### Auto-Kategorisasi

Setiap transaksi baru bisa di-background-process oleh AI:

```
Transaksi baru masuk → Queue background job
                     → AI analisis: description + merchant → kategori
                     → Update transaksi dengan kategori
                     → Flag ai_categorized = true
```

---

## 7. Bot Telegram

### Setup

1. Buat bot via @BotFather di Telegram → dapatkan `BOT_TOKEN`
2. Set webhook ke `https://yourdomain.vercel.app/api/bot/webhook`
3. User link akun: ketik `/start` → bot kirim link verifikasi → user klik → `telegram_chat_id` tersimpan di `user_settings`

### Command List

| Command                       | Fungsi                         |
| ----------------------------- | ------------------------------ |
| `/start`                      | Mulai & link akun              |
| `/help`                       | Daftar command                 |
| `/saldo`                      | Lihat saldo semua akun         |
| `/catat [jumlah] [deskripsi]` | Catat transaksi cepat          |
| `/hari ini`                   | Ringkasan transaksi hari ini   |
| `/minggu ini`                 | Ringkasan minggu ini           |
| `/bulan ini`                  | Ringkasan bulan ini            |
| `/budget`                     | Status budget semua kategori   |
| `/laporan`                    | Generate & kirim laporan Excel |
| `/tanya [pertanyaan]`         | Chat dengan AI assistant       |
| `/tagihan`                    | Hutang & piutang outstanding   |
| `/setting`                    | Pengaturan preferensi          |

### Natural Language Input

User tidak harus hafal command — bisa ketik bebas:

```
"habis 45rb buat makan siang"     → expense 45000, kategori Food
"terima gaji 5jt dari bca"        → income 5000000, akun BCA
"transfer 500rb ke gopay"         → transfer BCA → GoPay
"bayar hutang budi 200rb"         → payment debt Budi 200000
"berapa saldo gue?"               → cek saldo
```

**Parsing natural language via AI:**

```typescript
// Kirim pesan user ke OpenRouter (bisa gunakan model yang lebih ringan tanpa reasoning)
const parsed = await parseNaturalLanguage(message.text, userContext);
// Return: { intent, amount, category, account, description, date }
```

### Alur Implementasi

```typescript
// app/api/bot/webhook/route.ts
import { Bot } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// Middleware: cek apakah chatId terdaftar
bot.use(async (ctx, next) => {
  const user = await getUserByChatId(ctx.chat?.id);
  if (!user) {
    await ctx.reply("Akun belum terhubung. Klik: " + getAuthLink());
    return;
  }
  ctx.state.userId = user.id;
  await next();
});

// Handler command
bot.command("saldo", async (ctx) => {
  const accounts = await getAccountBalances(ctx.state.userId);
  const message = formatBalanceMessage(accounts);
  await ctx.reply(message, { parse_mode: "Markdown" });
});

// Handler pesan biasa (natural language)
bot.on("message:text", async (ctx) => {
  const parsed = await parseWithAI(ctx.message.text, ctx.state.userId);
  await handleParsedIntent(ctx, parsed);
});

export async function POST(req: Request) {
  const body = await req.json();
  await bot.handleUpdate(body);
  return Response.json({ ok: true });
}
```

### Format Pesan Bot

**Saldo:**

```
💰 *Saldo Keuangan*
─────────────────
🏦 BCA Tabungan     : Rp 8.450.000
💵 Kas Dompet       : Rp 350.000
📱 GoPay            : Rp 125.500
💳 OVO              : Rp 87.200
─────────────────
*Total: Rp 9.012.700*
```

**Konfirmasi transaksi:**

```
✅ *Transaksi dicatat!*

📌 Makan siang
💸 Rp 45.000 (Pengeluaran)
🏦 BCA Tabungan
📂 Makanan & Minuman
📅 27 Nov 2025

Sisa budget Makanan: Rp 255.000 (51%)
```

**Laporan harian:**

```
📊 *Ringkasan Hari Ini* — 27 Nov 2025

💚 Pemasukan    : Rp 0
❤️ Pengeluaran  : Rp 127.500

Transaksi hari ini:
• Makan siang   Rp 45.000
• Grab          Rp 32.500
• Kopi          Rp 25.000
• Snack         Rp 25.000
```

---

## 8. Export Excel (Template Menarik)

### Filosofi Desain Excel

Excel bukan sekedar data dump. Template harus:

- Terlihat profesional, bisa langsung dibagikan
- Warna konsisten dan enak dipandang
- Ada summary visual (dengan chart jika memungkinkan)
- Mudah di-filter dan di-analisis lebih lanjut

### Struktur File Excel (Multi-Sheet)

**Sheet 1: Dashboard / Ringkasan**

- Header dengan nama user, periode laporan, tanggal generate
- Warna background: navy/biru tua untuk header
- KPI cards: total income, total expense, net, saldo
- Tabel summary per kategori dengan progress bar (conditional formatting)
- Ringkasan top 5 kategori pengeluaran

**Sheet 2: Transaksi Detail**

- Header row: Tanggal, Deskripsi, Merchant, Kategori, Sub-Kategori, Tags, Akun, Tipe, Jumlah, Saldo Akun
- Warna alternating rows (zebrastripe)
- Kolom Amount: format currency IDR, merah untuk expense, hijau untuk income
- Auto-filter di header
- Freeze panes pada baris pertama

**Sheet 3: Ringkasan per Kategori**

- Tabel pivot-like: Kategori | Budget | Aktual | Sisa | % Used
- Conditional formatting: merah jika > 90%, kuning jika 70-90%, hijau jika < 70%

**Sheet 4: Cashflow Bulanan**

- Tabel: Bulan | Income | Expense | Net | Kumulatif
- Trend 12 bulan terakhir

**Sheet 5: Hutang & Piutang**

- Daftar hutang: Nama | Jumlah Awal | Sudah Bayar | Sisa | Jatuh Tempo | Status

### Implementasi ExcelJS

```typescript
import ExcelJS from "exceljs";

// Tema warna
const COLORS = {
  primary: "1E3A5F", // Navy biru (header)
  secondary: "2E86AB", // Biru sedang (sub-header)
  accent: "27AE60", // Hijau (income / positif)
  danger: "E74C3C", // Merah (expense / negatif)
  warning: "F39C12", // Kuning (warning)
  bgLight: "F8FAFC", // Background baris ganjil
  bgDark: "EDF2F7", // Background baris genap
  border: "CBD5E0", // Warna border
};

async function generateFinancialReport(userId: string, params: ExportParams) {
  const wb = new ExcelJS.Workbook();

  wb.creator = "Aplikasi Keuangan";
  wb.created = new Date();

  // Sheet 1: Dashboard
  await buildDashboardSheet(wb, userId, params);

  // Sheet 2: Transaksi Detail
  await buildTransactionSheet(wb, userId, params);

  // Sheet 3: Kategori
  await buildCategorySheet(wb, userId, params);

  // Sheet 4: Cashflow
  await buildCashflowSheet(wb, userId, params);

  // Sheet 5: Hutang
  await buildDebtSheet(wb, userId, params);

  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

async function buildDashboardSheet(
  wb: ExcelJS.Workbook,
  userId: string,
  params: ExportParams,
) {
  const ws = wb.addWorksheet("Dashboard", {
    views: [{ showGridLines: false }], // Sembunyikan gridlines untuk tampilan bersih
  });

  // Set column widths
  ws.columns = [
    { width: 3 }, // A: margin
    { width: 25 }, // B: label
    { width: 20 }, // C: nilai
    { width: 3 }, // D: spacer
    { width: 20 }, // E: label kanan
    { width: 20 }, // F: nilai kanan
  ];

  // Header utama
  const titleRow = ws.getRow(2);
  ws.mergeCells("B2:F2");
  const titleCell = ws.getCell("B2");
  titleCell.value = "📊 LAPORAN KEUANGAN PERSONAL";
  titleCell.font = {
    name: "Calibri",
    bold: true,
    size: 18,
    color: { argb: "FF" + COLORS.primary },
  };
  titleCell.alignment = { horizontal: "left" };

  // Sub-header periode
  ws.mergeCells("B3:F3");
  const periodCell = ws.getCell("B3");
  periodCell.value = `Periode: ${params.startDate} — ${params.endDate}`;
  periodCell.font = { name: "Calibri", size: 11, color: { argb: "FF6B7280" } };

  // Garis pemisah
  ws.mergeCells("B4:F4");
  ws.getCell("B4").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + COLORS.primary },
  };
  ws.getRow(4).height = 3;

  // KPI Cards (baris 6-9)
  const kpiData = [
    {
      label: "💚 Total Pemasukan",
      value: params.totalIncome,
      color: COLORS.accent,
    },
    {
      label: "❤️ Total Pengeluaran",
      value: params.totalExpense,
      color: COLORS.danger,
    },
    {
      label: "💰 Net Cashflow",
      value: params.netCashflow,
      color: params.netCashflow >= 0 ? COLORS.accent : COLORS.danger,
    },
    {
      label: "🏦 Total Saldo",
      value: params.totalBalance,
      color: COLORS.primary,
    },
  ];

  // ... (implementasi lengkap KPI cards dengan merge cells dan styling)
}
```

### Contoh Styling ExcelJS yang Penting

```typescript
// Fungsi helper: style header row
function styleHeaderRow(
  ws: ExcelJS.Worksheet,
  rowNumber: number,
  bgColor: string,
) {
  const row = ws.getRow(rowNumber);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + bgColor },
    };
    cell.font = {
      name: "Calibri",
      bold: true,
      size: 11,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF" + COLORS.border } },
    };
  });
  row.height = 32;
}

// Fungsi helper: zebrastripe rows
function applyZebraStripe(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
) {
  for (let i = startRow; i <= endRow; i++) {
    const row = ws.getRow(i);
    const bgColor = i % 2 === 0 ? COLORS.bgLight : COLORS.bgDark;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF" + bgColor },
      };
    });
  }
}

// Format currency IDR
function formatCurrency(
  ws: ExcelJS.Worksheet,
  cell: ExcelJS.Cell,
  value: number,
  type: "income" | "expense",
) {
  cell.value = value;
  cell.numFmt = '"Rp "#,##0';
  cell.font = {
    color: {
      argb: type === "income" ? "FF" + COLORS.accent : "FF" + COLORS.danger,
    },
    bold: true,
  };
}
```

### Cara Kirim Excel ke Email & Telegram

**Kirim ke Email (via Resend):**

```typescript
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "laporan@yourdomain.com",
  to: user.email,
  subject: `Laporan Keuangan ${params.period}`,
  html: emailTemplate,
  attachments: [
    {
      filename: `laporan-${params.period}.xlsx`,
      content: excelBuffer.toString("base64"),
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  ],
});
```

**Kirim ke Telegram:**

```typescript
import { InputFile } from "grammy";

await bot.api.sendDocument(
  chatId,
  new InputFile(excelBuffer, `laporan-${params.period}.xlsx`),
  {
    caption: `📊 Laporan Keuangan ${params.period}\n\nTotal Pemasukan: Rp ${income}\nTotal Pengeluaran: Rp ${expense}\nNet: Rp ${net}`,
  },
);
```

---

## 9. Notifikasi & Email

### Jenis Notifikasi

| Trigger                    | Channel              | Timing             |
| -------------------------- | -------------------- | ------------------ |
| Budget 80% terpakai        | Telegram + Email     | Real-time          |
| Budget 100% habis          | Telegram             | Real-time          |
| Hutang H-7 jatuh tempo     | Telegram + Email     | Otomatis pagi hari |
| Hutang H-1 jatuh tempo     | Telegram             | Otomatis pagi hari |
| Laporan harian             | Telegram             | Setiap jam 20:00   |
| Laporan mingguan           | Email + Telegram     | Senin pagi         |
| Laporan bulanan            | Email (dengan Excel) | Tanggal 1          |
| Recurring akan jatuh tempo | Telegram             | H-1                |

### Vercel Cron Jobs

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 13 * * *"   // Jam 20:00 WIB (UTC+7 = UTC 13:00)
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 1 * * 1"    // Senin jam 08:00 WIB
    },
    {
      "path": "/api/cron/monthly-report",
      "schedule": "0 1 1 * *"    // Tanggal 1 jam 08:00 WIB
    },
    {
      "path": "/api/cron/debt-reminder",
      "schedule": "0 1 * * *"    // Setiap hari jam 08:00 WIB
    }
  ]
}
```

### Template Email (HTML)

Email menggunakan design yang konsisten dengan app:

- Header dengan brand color + nama user
- KPI summary dalam tabel
- Top 5 pengeluaran
- Status budget
- Call-to-action: "Lihat laporan lengkap" → link ke app
- Attachment Excel jika laporan bulanan

---

## 10. Struktur Folder Proyek

```
my-finance-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── callback/
│   │       └── route.ts
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + header layout
│   │   ├── page.tsx                # Dashboard utama
│   │   ├── transactions/
│   │   │   ├── page.tsx            # Daftar transaksi
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Detail transaksi
│   │   ├── accounts/
│   │   │   └── page.tsx
│   │   ├── budgets/
│   │   │   └── page.tsx
│   │   ├── debts/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── ai-chat/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   └── api/
│       ├── transactions/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts        # GET, PUT, DELETE
│       ├── accounts/
│       │   └── route.ts
│       ├── budgets/
│       │   └── route.ts
│       ├── debts/
│       │   └── route.ts
│       ├── ai/
│       │   ├── chat/
│       │   │   └── route.ts        # Streaming AI chat
│       │   └── categorize/
│       │       └── route.ts        # Auto-kategorisasi
│       ├── export/
│       │   └── route.ts            # Generate & download Excel
│       ├── bot/
│       │   └── webhook/
│       │       └── route.ts        # Telegram webhook
│       └── cron/
│           ├── daily-report/
│           │   └── route.ts
│           ├── weekly-report/
│           │   └── route.ts
│           ├── monthly-report/
│           │   └── route.ts
│           └── debt-reminder/
│               └── route.ts
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── transactions/
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionList.tsx
│   │   ├── TransactionCard.tsx
│   │   └── TransactionFilters.tsx
│   ├── dashboard/
│   │   ├── KPICards.tsx
│   │   ├── CashflowChart.tsx
│   │   ├── CategoryChart.tsx
│   │   └── RecentTransactions.tsx
│   ├── budget/
│   │   ├── BudgetCard.tsx
│   │   └── BudgetProgress.tsx
│   ├── ai-chat/
│   │   ├── ChatInterface.tsx
│   │   ├── ChatMessage.tsx
│   │   └── QuickPrompts.tsx
│   └── shared/
│       ├── CurrencyInput.tsx
│       ├── DatePicker.tsx
│       ├── AccountSelector.tsx
│       └── CategorySelector.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client (RSC)
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── context-builder.ts      # Build konteks keuangan untuk AI
│   │   ├── action-parser.ts        # Parse action dari response AI
│   │   └── prompts.ts              # System prompts
│   ├── bot/
│   │   ├── bot.ts                  # Grammy bot instance
│   │   ├── handlers/               # Command handlers
│   │   ├── nl-parser.ts            # Natural language parser
│   │   └── formatters.ts           # Format pesan Telegram
│   ├── export/
│   │   ├── excel.ts                # ExcelJS generator
│   │   ├── pdf.ts                  # PDF generator
│   │   └── templates/              # Excel template configs
│   ├── notifications/
│   │   ├── email.ts                # Resend integration
│   │   └── telegram.ts             # Send via bot
│   └── utils/
│       ├── currency.ts             # Format & konversi currency
│       ├── date.ts                 # Date helpers
│       └── financial.ts            # Kalkulasi keuangan
├── types/
│   ├── database.ts                 # Generated Supabase types
│   ├── transaction.ts
│   ├── account.ts
│   └── ai.ts
├── hooks/
│   ├── useTransactions.ts
│   ├── useAccounts.ts
│   ├── useBudgets.ts
│   └── useAIChat.ts
├── stores/
│   └── useFinanceStore.ts          # Zustand global state
├── middleware.ts                   # Supabase auth middleware
├── next.config.js
├── tailwind.config.ts
└── .env.local
```

---

## 11. Prioritas MVP & Roadmap

### Phase 1: Core (Minggu 1-2) — WAJIB JALAN

**Goal:** Bisa catat dan lihat transaksi

- [ ] Setup project Next.js + Supabase + Tailwind + shadcn
- [ ] Auth (Supabase Magic Link / Google)
- [ ] CRUD Akun (bank, kas, e-wallet)
- [ ] CRUD Kategori (dengan defaults)
- [ ] CRUD Transaksi (income, expense, transfer)
- [ ] Dashboard sederhana (saldo, list transaksi)
- [ ] Deploy ke Vercel

### Phase 2: Laporan & Budget (Minggu 3-4)

**Goal:** Bisa analisis pengeluaran

- [ ] Filter & search transaksi
- [ ] Chart: cashflow, per kategori (Recharts)
- [ ] Budget management
- [ ] Budget alerts
- [ ] Export Excel (basic — satu sheet)

### Phase 3: Export Profesional (Minggu 5)

**Goal:** Laporan Excel yang menarik

- [ ] Multi-sheet Excel dengan styling lengkap
- [ ] PDF laporan
- [ ] Kirim via email (Resend)
- [ ] Export dengan filter tanggal/kategori

### Phase 4: Bot Telegram (Minggu 6-7)

**Goal:** Input & cek via Telegram

- [ ] Setup bot Telegram (Grammy)
- [ ] Command: /saldo, /catat, /hari ini
- [ ] Link akun via `/start`
- [ ] Natural language parsing sederhana
- [ ] Kirim laporan harian otomatis
- [ ] Kirim Excel via Telegram

### Phase 5: AI Interaktif (Minggu 8-10)

**Goal:** Chat dengan data keuangan

- [ ] OpenRouter API integration (dengan Reasoning)
- [ ] Context builder (ambil data finansial untuk prompt)
- [ ] Streaming chat UI
- [ ] Auto-kategorisasi transaksi
- [ ] AI via Telegram (`/tanya`)
- [ ] Deteksi anomali & saran

### Phase 6: Fitur ERP Lanjutan (Minggu 11+)

**Goal:** Fitur lengkap seperti ERP

- [ ] Hutang & piutang
- [ ] Recurring transactions
- [ ] Multi-currency + konversi
- [ ] Attachment bukti (Supabase Storage)
- [ ] Import CSV mutasi bank
- [ ] Notifikasi lengkap (cron jobs)
- [ ] Rekonsiliasi saldo

---

## 12. Keputusan Desain Penting

### Environment Variables yang Dibutuhkan

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENROUTER_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=   # Random string untuk verifikasi webhook

# Email
RESEND_API_KEY=
EMAIL_FROM=

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=               # Untuk proteksi cron job endpoint
```

### Pertimbangan Keamanan

- **RLS Supabase:** Semua tabel wajib aktif RLS, query via `service_role` hanya untuk cron
- **Webhook Telegram:** Validasi request dengan `TELEGRAM_WEBHOOK_SECRET`
- **Cron Jobs:** Proteksi endpoint cron dengan `CRON_SECRET` header
- **AI Context:** Jangan kirim data sensitif yang tidak perlu ke AI (cukup summary, bukan semua transaksi)
- **Attachment:** Supabase Storage dengan policy private per user
- **Rate Limiting:** Pasang rate limit di `/api/ai/chat` untuk menghindari abuse API

### Tips Pengembangan

- Mulai dengan **Server Components** di Next.js — lebih performant untuk data fetch
- Gunakan **Supabase Realtime** untuk update dashboard tanpa refresh
- **Optimistic updates** untuk form transaksi — UI update dulu, sync ke server background
- **Vercel Analytics** untuk monitoring penggunaan
- Gunakan `dinero.js` bukan `Number` biasa untuk kalkulasi keuangan (hindari floating point error)
- Setup **Supabase Database Webhooks** untuk trigger notifikasi real-time saat budget mendekati limit

### Estimasi Biaya Bulanan (saat personal)

| Service    | Free Tier                          | Kemungkinan Cukup? |
| ---------- | ---------------------------------- | ------------------ |
| Vercel     | 100GB bandwidth, unlimited deploys | ✅ Cukup           |
| Supabase   | 500MB DB, 1GB storage, 50k MAU     | ✅ Cukup           |
| OpenRouter | Pay per use (tergantung model)     | ✅ < $5/bulan      |
| Resend     | 3000 email/bulan                   | ✅ Cukup           |
| **Total**  |                                    | **~$0-5/bulan**    |

---

_Dokumen ini dibuat sebagai panduan brainstorming dan bisa terus diperbarui seiring perkembangan proyek._

_Stack: Next.js 16 · Supabase · Vercel · OpenRouter API · Grammy (Telegram) · ExcelJS · Resend_
