import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Login"
      subtitle="Access your protected dashboard, transactions, profile, goals, and AI reports."
      footer={
        <>
          New here? <Link className="text-teal" href="/register">Create an account</Link>
        </>
      }
    >
      <div className="grid gap-4">
        <GoogleButton />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-extrabold uppercase text-muted">
          <span className="h-px bg-slate-200" /> Or use email <span className="h-px bg-slate-200" />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </AuthCard>
  );
}
