# Smart Slip Analyzer

Smart Slip Analyzer is a full-stack AI personal finance web app for bank slip scanning, transaction tracking, spending analytics, budgets, goals, and AI financial reports.

## Stack

- Frontend: Next.js App Router, React, Tailwind CSS, responsive dashboard UI
- Backend: Next.js API routes, JWT cookie authentication, Zod validation
- Database: Prisma ORM with PostgreSQL schema
- AI layer: report engine adapter prepared for future OCR and LLM providers

## Architecture

```text
src/app
  page.tsx                    Dashboard interface
  api/auth/*                  Register, login, logout
  api/auth/google             Google OAuth redirect
  api/auth/google/callback    Google OAuth callback
  api/me                      Current authenticated user
  api/transactions/*          Transaction CRUD
  api/categories              Category management
  api/budgets                 Budget management
  api/goals                   Financial goal management
  api/ai/reports              AI report generation and history

src/components/dashboard      Reusable dashboard UI components
src/lib/auth.ts               JWT session helpers
src/lib/db.ts                 Prisma client
src/lib/validators.ts         API request schemas
src/lib/ai/report-engine.ts   Future AI provider boundary
prisma/schema.prisma          Database schema
```

## Database Models

- Users
- Transactions
- Categories
- Budgets
- Financial Goals
- AI Reports

User profiles include:

- Name
- Email
- Monthly income
- Saving goal
- Financial preference
- Currency

Protected routes:

- `/dashboard`
- `/profile`

Unauthenticated visitors are redirected to `/login`.

## Getting Started

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

Google OAuth requires these environment variables:

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

Demo seed user:

- Email: `demo@smartslip.ai`
- Password: `password123`
