import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
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
        <Suspense>
          <LoginForm />
        </Suspense>
        <Link className="text-sm font-bold text-teal" href="/forgot-password">Forgot password?</Link>
      </div>
    </AuthCard>
  );
}
