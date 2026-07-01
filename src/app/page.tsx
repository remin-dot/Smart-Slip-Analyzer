import Link from "next/link";
import { ArrowRight, Bot, FileScan, LockKeyhole, WalletCards } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  { title: "Slip AI", detail: "Extract merchant, amount, date, and category from bank slips.", icon: FileScan },
  { title: "Private dashboard", detail: "Keep income, expenses, budgets, and goals behind protected routes.", icon: LockKeyhole },
  { title: "Personal advice", detail: "Prepare AI reports around habits, risks, and saving opportunities.", icon: Bot }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-paper">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl content-center gap-10 px-5 py-10">
        <nav className="flex items-center justify-between">
          <Link className="inline-flex items-center gap-3 text-ink" href="/">
            <BrandLogo size={44} />
            <span>
              <strong className="block leading-5">Smart Slip</strong>
              <small className="font-semibold text-muted">Analyzer</small>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-ink" href="/login">
              Login
            </Link>
            <Link className="rounded-lg bg-teal px-4 py-3 text-sm font-extrabold text-white" href="/register">
              Register
            </Link>
          </div>
        </nav>

        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="eyebrow">AI personal finance assistant</p>
            <h1 className="mt-3 max-w-4xl text-5xl font-black leading-tight sm:text-7xl">
              Scan slips, protect your data, and understand your money.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Smart Slip Analyzer now includes credential login,
              profile preferences, and protected routes for personal financial data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-3 font-extrabold text-white" href="/register">
                Create account <ArrowRight size={18} />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 font-extrabold text-ink" href="/dashboard">
                Open dashboard <WalletCards size={18} />
              </Link>
            </div>
          </div>

          <div className="panel p-6 shadow-premium">
            <p className="eyebrow">Protected finance workspace</p>
            <div className="mt-5 grid gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div className="grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4" key={feature.title}>
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal/10 text-teal">
                      <Icon size={20} />
                    </span>
                    <span>
                      <strong className="block">{feature.title}</strong>
                      <small className="mt-1 block leading-6 text-muted">{feature.detail}</small>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
