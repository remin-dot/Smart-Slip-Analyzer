import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FileScan,
  Flag,
  Globe,
  HeartPulse,
  PiggyBank,
  Receipt,
  Repeat,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const FEATURES = [
  { icon: FileScan, title: "Slip & receipt scanning", detail: "Upload a bank slip or receipt — AI reads the merchant, amount, and date in seconds." },
  { icon: Receipt, title: "Effortless transactions", detail: "Search, filter, sort, and edit every transaction inline. No spreadsheet required." },
  { icon: PiggyBank, title: "Budgets that stick", detail: "Set monthly limits per category and watch friendly progress bars fill up." },
  { icon: Flag, title: "Saving goals", detail: "Pick a target and see exactly how much to set aside each month to hit it." },
  { icon: Repeat, title: "Subscription radar", detail: "Auto-detects recurring payments and flags the ones you might not use anymore." },
  { icon: HeartPulse, title: "Financial health score", detail: "A single 0–100 score plus clear, personalized tips on what to improve first." },
];

const STEPS = [
  { icon: Upload, title: "Snap or upload", detail: "Drop in a bank slip or receipt from your phone or computer." },
  { icon: Bot, title: "AI reads it", detail: "Merchant, amount, date, and category are extracted and tagged automatically." },
  { icon: Sparkles, title: "See the insights", detail: "Track spending, hit goals, and get a live picture of your money." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-white to-rausch/5 text-ink">
      {/* decorative background glows */}
      <div className="pointer-events-none absolute -right-32 -top-40 h-[32rem] w-[32rem] rounded-full bg-rausch/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-amber/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[24rem] w-[24rem] rounded-full bg-rausch/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-5">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6">
          <Link className="inline-flex items-center gap-3 text-ink" href="/">
            <BrandLogo size={44} />
            <span>
              <strong className="block leading-5">Smart Slip</strong>
              <small className="font-semibold text-muted">Analyzer</small>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link className="rounded-full px-4 py-2.5 text-sm font-extrabold text-ink transition-colors hover:bg-surface" href="/login">
              Login
            </Link>
            <Link className="rounded-full bg-rausch px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-opacity hover:opacity-90" href="/register">
              Get started
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="grid items-center gap-12 py-12 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-rausch/20 bg-rausch/5 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-rausch">
              <Sparkles size={13} /> AI personal finance
            </span>
            <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Turn bank slips into <span className="text-rausch">smarter</span> money decisions.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Snap a receipt and Smart Slip Analyzer reads it, categorizes it, and turns your
              spending into clean charts, budgets, and gentle advice — no spreadsheets, no stress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-full bg-rausch px-6 py-3.5 font-extrabold text-white shadow-sm transition-opacity hover:opacity-90" href="/register">
                Start for free <ArrowRight size={18} />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-6 py-3.5 font-extrabold text-ink transition-colors hover:bg-surface" href="/login">
                Live demo
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-muted">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-rausch" /> Private by default</span>
              <span className="inline-flex items-center gap-1.5"><Globe size={15} className="text-rausch" /> 4 languages · 10 currencies</span>
            </div>
          </div>

          {/* Hero preview card */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-rausch/20 to-amber/10 blur-2xl" />
            <div className="panel relative rounded-[1.75rem] p-6 shadow-premium">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Financial health</span>
                <span className="rounded-full bg-mint/15 px-2.5 py-1 text-xs font-extrabold text-mint">Good</span>
              </div>
              <div className="mt-4 flex items-center gap-5">
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[6px] border-rausch/15 border-t-rausch text-3xl font-black">
                  82
                </div>
                <div className="grid flex-1 gap-2.5">
                  {[["Saving rate", "88%", "88%"], ["Spending", "72%", "72%"], ["Budgets", "64%", "64%"]].map(([label, val, w]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-muted">{label}</span>
                        <span>{val}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-surface-strong">
                        <div className="h-full rounded-full bg-rausch" style={{ width: w }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[["Income", "$4,200"], ["Spent", "$2,540"], ["Saved", "$1,660"]].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-hairline bg-surface p-3">
                    <p className="text-xs font-bold text-muted">{k}</p>
                    <p className="mt-1 text-base font-black">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Everything in one place</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">One app for every part of your money</h2>
            <p className="mt-4 text-lg leading-8 text-muted">From the first receipt to a full picture of your finances.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, detail }) => (
              <div
                key={title}
                className="group rounded-2xl border border-hairline bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-premium"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-rausch/10 text-rausch transition-colors group-hover:bg-rausch group-hover:text-white">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-black">{title}</h3>
                <p className="mt-2 leading-7 text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Three steps to clarity</h2>
          </div>
          <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, detail }, i) => (
              <div key={title} className="relative text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-premium ring-1 ring-hairline">
                  <Icon size={26} className="text-rausch" />
                </div>
                <span className="mt-4 inline-block rounded-full bg-surface px-2.5 py-0.5 text-xs font-black text-muted">Step {i + 1}</span>
                <h3 className="mt-2 text-lg font-black">{title}</h3>
                <p className="mx-auto mt-2 max-w-xs leading-7 text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="py-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-rausch to-[#ff6b81] p-10 text-center text-white shadow-premium sm:p-16">
            <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 right-0 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-3xl font-black sm:text-4xl">Ready to understand your money?</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-lg text-white/90">
              Create a free account and turn your next receipt into insight.
            </p>
            <Link
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-extrabold text-rausch transition-transform hover:scale-[1.03]"
              href="/register"
            >
              Get started free <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-hairline py-8 text-sm text-muted sm:flex-row">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} />
            <span className="font-bold text-ink">Smart Slip Analyzer</span>
          </div>
          <p>© {new Date().getFullYear()} Smart Slip Analyzer. Made to make money feel less scary.</p>
        </footer>
      </div>
    </main>
  );
}
