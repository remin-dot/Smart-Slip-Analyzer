import {
  ChartNoAxesCombined,
  CircleDollarSign,
  FileScan,
  Flag,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  PiggyBank,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Star,
  TrendingUp,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { FinancialPredictions } from "@/components/predictions/financial-predictions";
import { getCurrentUser } from "@/lib/auth";

export default async function PredictionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/predictions");
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-8 bg-[#102c3a] p-5 text-white lg:sticky lg:top-0 lg:h-screen">
          <Link className="flex items-center gap-3 text-white" href="/">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#f5c25b] font-black text-[#102c3a]">S</div>
            <div>
              <p className="font-extrabold leading-5">Smart Slip</p>
              <p className="text-sm text-white/65">Analyzer</p>
            </div>
          </Link>

          <nav className="grid gap-2 text-sm font-bold text-white/70">
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/dashboard">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/scanner">
              <FileScan size={18} /> Slip Scanner
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/transactions">
              <CircleDollarSign size={18} /> Transactions
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/budgets">
              <PiggyBank size={18} /> Budgets
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/goals">
              <Flag size={18} /> Saving Goals
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/chat">
              <MessageCircle size={18} /> AI Assistant
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/purchase">
              <ShoppingCart size={18} /> Purchase Advisor
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/subscriptions">
              <Repeat size={18} /> Subscriptions
            </Link>
            <Link className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3 text-white" href="/predictions">
              <TrendingUp size={18} /> Predictions
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/wealth">
              <Landmark size={18} /> Wealth
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/achievements">
              <Star size={18} /> Achievements
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/dashboard#analytics">
              <ChartNoAxesCombined size={18} /> Analytics
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="/profile">
              <UserRound size={18} /> Profile
            </Link>
          </nav>

          <div className="mt-auto rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white/70">
              <ShieldCheck size={17} /> Protected
            </div>
            <p className="mt-3 text-2xl font-black">{user.name}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{user.email}</p>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-[1440px] p-5 sm:p-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">AI-powered forecasting</p>
              <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">
                Predictions
              </h1>
              <p className="mt-3 max-w-lg text-base leading-8 text-muted">
                Forecast your end-of-month balance, future savings, and spending trends using your real transaction history.
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-ink hover:bg-slate-50"
              href="/dashboard"
            >
              <LayoutDashboard size={16} /> Back to Dashboard
            </Link>
          </header>

          <section className="mt-6">
            <FinancialPredictions />
          </section>
        </section>
      </div>
    </main>
  );
}
