"use client";

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
import type { Route } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { LangSwitcher } from "@/components/lang-switcher";
import { useI18n } from "@/lib/i18n";

export type PageKey =
  | "dashboard" | "scanner" | "transactions" | "budgets" | "goals"
  | "chat" | "purchase" | "subscriptions" | "predictions" | "wealth"
  | "achievements" | "premium" | "profile";

const NAV: { key: PageKey | "analytics"; href: Route; Icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { key: "scanner", href: "/scanner", Icon: FileScan },
  { key: "transactions", href: "/transactions", Icon: CircleDollarSign },
  { key: "budgets", href: "/budgets", Icon: PiggyBank },
  { key: "goals", href: "/goals", Icon: Flag },
  { key: "chat", href: "/chat", Icon: MessageCircle },
  { key: "purchase", href: "/purchase", Icon: ShoppingCart },
  { key: "subscriptions", href: "/subscriptions", Icon: Repeat },
  { key: "predictions", href: "/predictions", Icon: TrendingUp },
  { key: "wealth", href: "/wealth", Icon: Landmark },
  { key: "achievements", href: "/achievements", Icon: Star },
  { key: "premium", href: "/premium", Icon: Crown },
  { key: "analytics", href: "/dashboard#analytics", Icon: ChartNoAxesCombined },
  { key: "profile", href: "/profile", Icon: UserRound },
];

export function AppShell({
  active,
  user,
  titleSuffix,
  dark,
  children,
}: {
  active: PageKey;
  user: { name: string; email: string };
  titleSuffix?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  // Airbnb is a light, white-canvas system; `dark` keeps the premium page's theme.
  const asideCls = dark
    ? "bg-[#0a0f1a] border-r border-white/5 text-white"
    : "bg-white border-r border-hairline text-ink";

  return (
    <main className={`min-h-screen ${dark ? "bg-[#0a0f1a]" : "bg-white"}`}>
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className={`flex flex-col gap-6 p-5 lg:sticky lg:top-0 lg:h-screen ${asideCls}`}>
          <Link className="flex items-center gap-3" href="/">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-rausch text-lg font-bold text-white">S</div>
            <div>
              <p className="font-semibold leading-5">Smart Slip</p>
              <p className={`text-sm ${dark ? "text-white/55" : "text-muted"}`}>Analyzer</p>
            </div>
          </Link>

          <nav className="grid gap-1 text-[15px] font-medium">
            {NAV.map(({ key, href, Icon }) => {
              const isActive = key === active;
              const cls = dark
                ? isActive
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:bg-white/5 hover:text-white/80"
                : isActive
                  ? "bg-rausch/10 text-rausch"
                  : "text-body hover:bg-surface hover:text-ink";
              return (
                <Link key={key} href={href} className={`flex items-center gap-3 rounded-full px-3.5 py-2.5 ${cls}`}>
                  <Icon size={18} /> {t(`nav.${key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto grid gap-2">
            <LangSwitcher />
            <CurrencySwitcher />
            <div className={`rounded-2xl p-4 ${dark ? "border border-white/10 bg-white/5" : "border border-hairline bg-surface"}`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${dark ? "text-white/55" : "text-muted"}`}>
                <ShieldCheck size={17} className="text-rausch" /> {t("shell.protected")}
              </div>
              <p className="mt-3 text-lg font-semibold">{user.name}</p>
              <p className={`mt-0.5 text-sm leading-5 ${dark ? "text-white/45" : "text-muted"}`}>{user.email}</p>
              <div className="mt-3">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <section className="mx-auto w-full max-w-[1440px] p-5 sm:p-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={dark ? "text-xs font-bold uppercase tracking-wide text-rausch" : "eyebrow"}>
                {t(`${active}.eyebrow`)}
              </p>
              <h1 className={`mt-2 text-[28px] font-bold leading-tight sm:text-[32px] ${dark ? "text-white" : "text-ink"}`}>
                {t(`${active}.title`)}{titleSuffix ? `, ${titleSuffix}` : ""}
              </h1>
              <p className={`mt-2 max-w-lg text-base leading-7 ${dark ? "text-slate-400" : "text-muted"}`}>
                {t(`${active}.subtitle`)}
              </p>
            </div>
            {active !== "dashboard" && (
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-ink bg-white px-5 py-3 text-sm font-medium text-ink hover:bg-surface"
                href="/dashboard"
              >
                <LayoutDashboard size={16} /> {t("nav.dashboard")}
              </Link>
            )}
          </header>

          <section className="mt-6">{children}</section>
        </section>
      </div>
    </main>
  );
}
