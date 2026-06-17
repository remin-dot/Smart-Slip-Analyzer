import {
  ArrowUpRight,
  Bot,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileScan,
  Goal,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Upload,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth";

const categories = [
  { name: "Food & Dining", amount: "$680", progress: 78, color: "bg-coral" },
  { name: "Groceries", amount: "$520", progress: 61, color: "bg-teal" },
  { name: "Transport", amount: "$310", progress: 36, color: "bg-ocean" },
  { name: "Subscriptions", amount: "$184", progress: 22, color: "bg-amber" }
];

const transactions = [
  { merchant: "Bean & Budget Cafe", category: "Food & Dining", amount: "-$18.60", date: "17 Jun" },
  { merchant: "Northline Payroll", category: "Income", amount: "+$2,850", date: "15 Jun" },
  { merchant: "Metro Card Top Up", category: "Transport", amount: "-$45.00", date: "14 Jun" },
  { merchant: "Cloud Desk Suite", category: "Subscriptions", amount: "-$29.00", date: "12 Jun" }
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const monthlyIncome = Number(user.monthlyIncome);
  const savingGoal = Number(user.savingGoal);
  const savingRate = monthlyIncome > 0 ? Math.round((savingGoal / monthlyIncome) * 100) : 0;

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
            <Link className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3 text-white" href="/dashboard">
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <a className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="#scanner">
              <FileScan size={18} /> Slip Scanner
            </a>
            <a className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white/10 hover:text-white" href="#analytics">
              <ChartNoAxesCombined size={18} /> Analytics
            </a>
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
          </div>
        </aside>

        <section className="mx-auto w-full max-w-[1440px] p-5 sm:p-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow">Private financial dashboard</p>
              <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">Welcome, {user.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-ink" href="/profile">
                Edit profile
              </Link>
              <LogoutButton />
            </div>
          </header>

          <section className="panel mt-6 grid gap-8 overflow-hidden p-6 shadow-premium lg:grid-cols-[1.1fr_0.9fr] lg:p-9">
            <div>
              <p className="eyebrow">Upload slip - classify expense - improve decisions</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                Your protected AI finance workspace.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
                Personal data is available only after authentication. Income, saving goals,
                financial preferences, and AI reports are tied to your user profile.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-3 font-extrabold text-white" href="#scanner">
                  <Upload size={18} /> Analyze slip
                </a>
                <Link className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 font-extrabold text-ink" href="/profile">
                  User profile <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>

            <div className="grid content-center gap-4">
              <DashboardCard title="AI extraction result" icon={<ReceiptText size={19} />}>
                <div className="grid gap-3">
                  {[
                    ["Merchant", "Bean & Budget Cafe"],
                    ["Amount", "$18.60"],
                    ["Category", "Food & Dining"],
                    ["Preference", user.financialPreference]
                  ].map(([label, value]) => (
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3" key={label}>
                      <span className="text-sm font-bold text-muted">{label}</span>
                      <span className="font-black">{value}</span>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>
          </section>

          <section className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Monthly Income" value={`$${monthlyIncome.toLocaleString()}`} note="From user profile" tone="good" />
            <MetricCard label="Saving Goal" value={`$${savingGoal.toLocaleString()}`} note="Personal target" tone="good" />
            <MetricCard label="Expenses" value="$2,840" note="Dining above target" tone="warn" />
            <MetricCard label="Goal Rate" value={`${savingRate}%`} note="Goal compared to income" tone="good" />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <DashboardCard id="scanner" title="Slip scanner" eyebrow="Authenticated workflow" icon={<FileScan size={19} />}>
              <div className="grid min-h-[210px] place-items-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-teal text-white">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="mt-3 font-black">Drop a bank slip or receipt</p>
                  <p className="mt-1 text-sm text-muted">Ready for OCR, model extraction, and validation pipelines.</p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard id="analytics" title="Category analytics" eyebrow="Spending behavior" icon={<ChartNoAxesCombined size={19} />}>
              <div className="grid gap-4">
                {categories.map((category) => (
                  <div key={category.name}>
                    <div className="mb-2 flex items-center justify-between text-sm font-extrabold">
                      <span>{category.name}</span>
                      <span>{category.amount}</span>
                    </div>
                    <ProgressBar progress={category.progress} colorClass={category.color} />
                  </div>
                ))}
              </div>
            </DashboardCard>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <DashboardCard title="Transaction management" eyebrow="Protected API ready" icon={<CircleDollarSign size={19} />}>
              <div className="grid gap-3">
                {transactions.map((transaction) => (
                  <div className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-slate-200 p-4" key={transaction.merchant}>
                    <div>
                      <p className="font-black">{transaction.merchant}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">{transaction.category} - {transaction.date}</p>
                    </div>
                    <span className={transaction.amount.startsWith("+") ? "font-black text-mint" : "font-black text-ink"}>
                      {transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard id="goals" title="AI recommendations" eyebrow="Preference aware" icon={<Bot size={19} />}>
              <div className="grid gap-3">
                <div className="rounded-lg bg-teal/10 p-4">
                  <p className="font-black">Saving goal is part of your profile</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Future AI reports can use your monthly income and preference to tune advice.</p>
                </div>
                <div className="rounded-lg bg-amber/10 p-4">
                  <p className="font-black">Protected routes are active</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Personal finance pages redirect unauthenticated visitors to login.</p>
                </div>
              </div>
            </DashboardCard>
          </section>
        </section>
      </div>
    </main>
  );
}
