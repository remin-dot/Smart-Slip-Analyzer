import {
  ChartNoAxesCombined,
  CircleDollarSign,
  Crown,
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
import { PremiumDashboard } from "@/components/dashboard/premium-dashboard";
import { getCurrentUser } from "@/lib/auth";

export default async function PremiumPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/premium");
  }

  return (
    <main className="min-h-screen bg-[#0a0f1a]">
      <style>{`
        .glass-sidebar {
          background: rgba(8,15,32,0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid rgba(255,255,255,0.06);
        }
      `}</style>

      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        {/* ── Dark glassmorphism sidebar ───────────────────────── */}
        <aside className="glass-sidebar flex flex-col gap-8 p-5 text-white lg:sticky lg:top-0 lg:h-screen">
          <Link className="flex items-center gap-3 text-white" href="/">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 font-black text-white shadow-lg shadow-cyan-500/20">
              S
            </div>
            <div>
              <p className="font-extrabold leading-5">Smart Slip</p>
              <p className="text-sm text-white/50">Analyzer</p>
            </div>
          </Link>

          <nav className="grid gap-1 text-sm font-bold text-white/50">
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/dashboard">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/scanner">
              <FileScan size={18} /> Slip Scanner
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/transactions">
              <CircleDollarSign size={18} /> Transactions
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/budgets">
              <PiggyBank size={18} /> Budgets
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/goals">
              <Flag size={18} /> Saving Goals
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/chat">
              <MessageCircle size={18} /> AI Assistant
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/purchase">
              <ShoppingCart size={18} /> Purchase Advisor
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/subscriptions">
              <Repeat size={18} /> Subscriptions
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/predictions">
              <TrendingUp size={18} /> Predictions
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/wealth">
              <Landmark size={18} /> Wealth
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/achievements">
              <Star size={18} /> Achievements
            </Link>
            <Link className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2.5 text-cyan-400" href="/premium">
              <Crown size={18} /> Premium Dashboard
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/dashboard#analytics">
              <ChartNoAxesCombined size={18} /> Analytics
            </Link>
            <Link className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:text-white/80" href="/profile">
              <UserRound size={18} /> Profile
            </Link>
          </nav>

          <div className="mt-auto rounded-xl border border-white/8 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white/50">
              <ShieldCheck size={17} className="text-cyan-400" /> Protected
            </div>
            <p className="mt-3 text-xl font-black text-white">{user.name}</p>
            <p className="mt-1 text-sm text-white/40">{user.email}</p>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </aside>

        {/* ── Content area ────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1440px] p-5 sm:p-8">
          <header className="mb-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400">
              <Crown size={14} /> Premium Dashboard
            </div>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Financial Overview
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Your complete financial picture — powered by AI intelligence.
            </p>
          </header>

          <PremiumDashboard />
        </section>
      </div>
    </main>
  );
}
