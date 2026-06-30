import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
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
        <RegisterForm />
      </div>
    </AuthCard>
  );
}
