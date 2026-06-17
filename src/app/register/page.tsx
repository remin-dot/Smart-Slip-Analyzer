import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Register"
      subtitle="Create your personal finance profile with income, saving goal, and advice preference."
      footer={
        <>
          Already registered? <Link className="text-teal" href="/login">Login</Link>
        </>
      }
    >
      <div className="grid gap-4">
        <GoogleButton />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-extrabold uppercase text-muted">
          <span className="h-px bg-slate-200" /> Or create profile <span className="h-px bg-slate-200" />
        </div>
        <RegisterForm />
      </div>
    </AuthCard>
  );
}
