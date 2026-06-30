# 🧾 Smart Slip Analyzer

> Snap a bank slip → get a tidy, smart picture of your money. 💸

Smart Slip Analyzer is a personal-finance web app that turns the messy receipts and
bank slips in your life into clean transactions, friendly charts, and gentle advice —
so you actually understand where your money goes.

It’s your finances, minus the spreadsheet headache.

---

## ✨ What it can do

| | Feature | What you get |
|---|---|---|
| 📸 | **Slip Scanner** | Upload a slip/receipt → AI reads the merchant, amount, and date for you |
| 💳 | **Transactions** | Search, filter, sort, and edit every transaction inline |
| 🏷️ | **Smart categories** | Each transaction gets auto-tagged (Groceries, Rent, Coffee…) |
| 🐷 | **Budgets** | Set monthly limits per category and watch your progress bars |
| 🎯 | **Saving goals** | Pick a target, see exactly how much to save each month |
| 🔁 | **Subscriptions** | Auto-detects recurring payments *and* lets you add/edit your own |
| 📊 | **Dashboard** | A health score (0–100) + charts for income, spending, and trends |
| 💬 | **AI assistant** | Ask “Can I afford this?” and get answers grounded in *your* data |
| 🌍 | **4 languages** | English, ไทย, 中文, 日本語 — switch anytime |
| 💱 | **10 currencies** | USD, EUR, GBP, THB, JPY… your money, your symbol |

---

## 🛠️ How it works

The whole app is one **Next.js** project — the website and the backend live together.

```
                    ┌─────────────────────────────────────────┐
   You 🧍 ──upload──►│  Slip Scanner                            │
                    │     │                                     │
                    │     ▼                                     │
                    │  AI reads the slip ──► Transaction saved  │
                    └─────────────────┬───────────────────────┘
                                      ▼
        ┌───────────────────────────────────────────────────────┐
        │  Your data (PostgreSQL via Prisma)                     │
        │  transactions · budgets · goals · subscriptions · …    │
        └───────────────────────────────┬───────────────────────┘
                                         ▼
              Dashboard 📊 · Health score · Charts · AI advice 💬
```

**A few things that make it tick:**

- 🔐 **Login that protects your data.** Sign up with email + password; you get a
  signed cookie (JWT). Pages like `/dashboard` and `/profile` are locked to
  logged-in users — everyone else is bounced to `/login`. Forgot your password?
  There’s a reset flow too.
- 🤖 **AI that’s optional.** Set an `OPENAI_API_KEY` and the scanner, classifier,
  and chat get smarter. **No key? It still works** — it quietly falls back to
  built-in rules. The health score is computed locally either way.
- ✅ **Every input is checked.** All API requests are validated with Zod before
  anything touches the database, so junk data can’t sneak in.

---

## 🧱 Built with

- **Next.js 15** (App Router) + **React 19** — the app and its API routes
- **Tailwind CSS** — the clean, responsive look
- **Prisma** + **Neon serverless Postgres** — the database
- **JWT cookies** (`jose` + `bcrypt`) — authentication
- **Zod** — request validation
- **Cloudflare Workers** (via OpenNext) — where it deploys

---

## 🚀 Run it locally

You’ll need **Node 18+** and a **PostgreSQL** database. The easiest option is a
free [Neon](https://neon.tech) database (it matches the deploy setup) — or any
local Postgres works too.

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and add your database URL
cp .env.example .env
#    → open .env and set DATABASE_URL + a long random JWT_SECRET

# 3. Set up the database
npm run prisma:generate
npm run prisma:migrate
npm run db:seed        # optional: loads a demo account + sample data

# 4. Start the app
npm run dev
```

Open **http://localhost:3000** 🎉

**Want to try it instantly?** The seed creates a demo user:

```
📧 demo@smartslip.ai
🔑 password123
```

### Optional extras

| Variable | What it unlocks |
|---|---|
| `OPENAI_API_KEY` | Smarter slip reading, categorization, and chat (otherwise uses built-in rules) |
| `JWT_SECRET` | **Required** — any long random string keeps your login sessions secure |
| `NEXT_PUBLIC_APP_URL` | Your app’s base URL (default `http://localhost:3000`) |

---

## 🗺️ Project map

```
src/
├── app/
│   ├── dashboard/        📊 your money at a glance
│   ├── scanner/          📸 upload & read slips
│   ├── transactions/     💳 the editable list of everything
│   ├── budgets/          🐷 spending limits
│   ├── goals/            🎯 saving targets
│   ├── subscriptions/    🔁 recurring payments
│   ├── chat/             💬 the AI assistant
│   ├── profile/          ⚙️  name, currency, language
│   ├── login · register · forgot-password   🔐 auth pages
│   └── api/              🔌 the backend (auth, transactions, ai, …)
│
├── components/           🧩 the UI building blocks
└── lib/
    ├── auth.ts           🔐 session & password helpers
    ├── db.ts             🗄️  database connection
    ├── validators.ts     ✅ Zod request schemas
    ├── i18n.tsx          🌍 the 4-language dictionary
    └── ai/               🤖 scanner, classifier, chat, health score

prisma/schema.prisma      🧬 the shape of all your data
```

---

## 💾 What it remembers

Your account, transactions, categories, budgets, goals, subscriptions, AI reports,
and wealth snapshots — all tied to **you** and nobody else.

---

Made to make money feel a little less scary. 💛
