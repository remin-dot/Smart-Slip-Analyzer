"use client";

import {
  CircleDollarSign,
  FileScan,
  Flag,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  PanelLeft,
  PiggyBank,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { LangSwitcher } from "@/components/lang-switcher";
import { useI18n } from "@/lib/i18n";

export type PageKey =
  | "dashboard" | "scanner" | "transactions" | "budgets" | "goals"
  | "chat" | "purchase" | "subscriptions" | "predictions" | "wealth"
  | "achievements" | "premium" | "profile";

type NavItem = { key: PageKey; href: Route; Icon: typeof LayoutDashboard };

// Grouped so the long flat list reads as a few scannable sections.
const NAV_GROUPS: { labelKey: string; items: NavItem[] }[] = [
  {
    labelKey: "shell.grpOverview",
    items: [{ key: "dashboard", href: "/dashboard", Icon: LayoutDashboard }],
  },
  {
    labelKey: "shell.grpSpending",
    items: [
      { key: "scanner", href: "/scanner", Icon: FileScan },
      { key: "transactions", href: "/transactions", Icon: CircleDollarSign },
      { key: "budgets", href: "/budgets", Icon: PiggyBank },
      { key: "subscriptions", href: "/subscriptions", Icon: Repeat },
    ],
  },
  {
    labelKey: "shell.grpGrowth",
    items: [
      { key: "goals", href: "/goals", Icon: Flag },
      { key: "wealth", href: "/wealth", Icon: Landmark },
      { key: "predictions", href: "/predictions", Icon: TrendingUp },
    ],
  },
  {
    labelKey: "shell.grpAssistant",
    items: [
      { key: "chat", href: "/chat", Icon: MessageCircle },
      { key: "purchase", href: "/purchase", Icon: ShoppingCart },
      { key: "achievements", href: "/achievements", Icon: Star },
    ],
  },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AppShell({
  active,
  user,
  titleSuffix,
  dark,
  children,
}: {
  active: PageKey;
  user: { name: string; email: string; image?: string | null };
  titleSuffix?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);

  // Airbnb is a light, white-canvas system; `dark` keeps the premium page's theme.
  const asideCls = dark
    ? "bg-[#0a0f1a] border-r border-white/5 text-white"
    : "bg-white border-r border-hairline text-ink";

  return (
    <main className={`min-h-screen ${dark ? "bg-[#0a0f1a]" : "bg-white"}`}>
      {/* Backdrop — only below lg, where the sidebar overlays content. */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col gap-6 p-5 transition-transform duration-300 ease-out ${asideCls} ${
          open ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            href={"/profile" as Route}
            className={`flex min-w-0 items-center gap-3 rounded-2xl p-1.5 pr-3 transition-colors ${
              dark ? "hover:bg-white/5" : "hover:bg-surface"
            }`}
          >
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-rausch/30"
              />
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rausch text-base font-bold text-white ring-2 ring-rausch/20">
                {initials(user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold leading-5">{user.name}</p>
              <p className={`truncate text-sm leading-5 ${dark ? "text-white/55" : "text-muted"}`}>{user.email}</p>
            </div>
          </Link>
          <button
            aria-label="Collapse menu"
            onClick={() => setOpen(false)}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
              dark ? "text-white/60 hover:bg-white/10" : "text-muted hover:bg-surface"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="grid gap-5 overflow-y-auto text-[15px] font-medium">
          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey} className="grid gap-1">
              <p className={`px-3.5 pb-0.5 text-[11px] font-bold uppercase tracking-wider ${dark ? "text-white/35" : "text-muted"}`}>
                {t(group.labelKey)}
              </p>
              {group.items.map(({ key, href, Icon }) => {
                const isActive = key === active;
                const cls = dark
                  ? isActive
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
                  : isActive
                    ? "bg-rausch/10 text-rausch"
                    : "text-body hover:bg-surface hover:text-ink";
                return (
                  <Link key={key} href={href} className={`flex items-center gap-3 rounded-full px-3.5 py-2.5 transition-colors ${cls}`}>
                    <Icon size={18} /> {t(`nav.${key}`)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto grid gap-2">
          <LangSwitcher />
          <CurrencySwitcher />
          <div className={`rounded-2xl p-4 ${dark ? "border border-white/10 bg-white/5" : "border border-hairline bg-surface"}`}>
            <div className={`flex items-center gap-2 text-sm font-semibold ${dark ? "text-white/55" : "text-muted"}`}>
              <ShieldCheck size={17} className="text-rausch" /> {t("shell.protected")}
            </div>
            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Content shifts right on lg when the sidebar is open; slides under it on smaller screens. */}
      <section
        className={`mx-auto w-full max-w-[1440px] p-5 transition-[padding] duration-300 ease-out sm:p-8 ${
          open ? "lg:pl-[300px]" : "lg:pl-8"
        }`}
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {!open && (
              <button
                aria-label="Open menu"
                onClick={() => setOpen(true)}
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors ${
                  dark ? "border-white/10 text-white hover:bg-white/10" : "border-hairline text-ink hover:bg-surface"
                }`}
              >
                <PanelLeft size={18} />
              </button>
            )}
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
          </div>
          {active !== "dashboard" && (
            <Link
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-ink bg-white px-5 py-3 text-sm font-medium text-ink hover:bg-surface"
              href="/dashboard"
            >
              <LayoutDashboard size={16} /> {t("nav.dashboard")}
            </Link>
          )}
        </header>

        <section className="mt-6">{children}</section>
      </section>
    </main>
  );
}
