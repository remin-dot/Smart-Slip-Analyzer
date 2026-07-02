import Link from "next/link";
import { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

type AuthCardProps = {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <main className="grid min-h-screen bg-paper px-5 py-10">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Link className="inline-flex items-center gap-3 text-ink" href="/">
            <BrandLogo size={44} />
            <span>
              <strong className="block leading-5">Slipora</strong>
              <small className="font-semibold text-muted">Smart Slip Analyzer</small>
            </span>
          </Link>
          <p className="eyebrow mt-12">Private finance workspace</p>
          <h1 className="mt-3 max-w-xl text-5xl font-black leading-tight">Turn bank slips into smarter financial decisions.</h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-muted">
            Secure authentication keeps transactions, goals, budgets, and AI reports tied to each user profile.
          </p>
        </div>

        <div className="panel p-6 shadow-premium sm:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-black">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">{subtitle}</p>
          </div>
          {children}
          <div className="mt-6 border-t border-slate-200 pt-5 text-sm font-bold text-muted">{footer}</div>
        </div>
      </section>
    </main>
  );
}
