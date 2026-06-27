DROP TABLE IF EXISTS debt_payments, debts, recurring_schedules, budgets, transactions, categories, accounts, user_settings, ai_conversations CASCADE;

-- 1. accounts
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,                    
  type        TEXT NOT NULL,                    
  currency    TEXT NOT NULL DEFAULT 'IDR',
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0,
  color       TEXT,                             
  icon        TEXT,                             
  is_active   BOOLEAN DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. categories
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),   
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,                    
  parent_id   UUID REFERENCES categories(id),  
  color       TEXT,
  icon        TEXT,
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. transactions
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  account_id      UUID NOT NULL REFERENCES accounts(id),
  category_id     UUID REFERENCES categories(id),
  type            TEXT NOT NULL,                
  amount          NUMERIC(18,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'IDR',
  amount_idr      NUMERIC(18,2),               
  exchange_rate   NUMERIC(10,6) DEFAULT 1,
  description     TEXT,
  notes           TEXT,
  tags            TEXT[],                       
  date            DATE NOT NULL,
  time            TIME,
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurring_id    UUID,                         
  reference_no    TEXT,                         
  location        TEXT,
  merchant        TEXT,                         
  is_transfer     BOOLEAN DEFAULT FALSE,
  transfer_to     UUID REFERENCES accounts(id), 
  attachments     TEXT[],                       
  ai_categorized  BOOLEAN DEFAULT FALSE,        
  source          TEXT DEFAULT 'web',           
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);

-- 4. budgets
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  category_id   UUID REFERENCES categories(id),
  name          TEXT NOT NULL,
  amount        NUMERIC(18,2) NOT NULL,
  period        TEXT NOT NULL,             
  start_date    DATE,
  end_date      DATE,
  alert_at      NUMERIC(5,2) DEFAULT 80,  
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. user_settings
CREATE TABLE user_settings (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id),
  telegram_chat_id  TEXT UNIQUE,         
  base_currency     TEXT DEFAULT 'IDR',
  timezone          TEXT DEFAULT 'Asia/Jakarta',
  date_format       TEXT DEFAULT 'DD/MM/YYYY',
  report_day        INTEGER DEFAULT 1,   
  notify_budget     BOOLEAN DEFAULT TRUE,
  notify_recurring  BOOLEAN DEFAULT TRUE,
  notify_report     TEXT DEFAULT 'weekly', 
  report_email      TEXT,
  ai_context_months INTEGER DEFAULT 3,   
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can only access own accounts" ON accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can only access own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can only access own transactions" ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can only access own budgets" ON budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can only access own settings" ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
