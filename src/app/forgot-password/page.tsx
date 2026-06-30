import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="Enter your account email and we'll send a link to set a new password."
      footer={
        <>
          Remembered it? <Link className="text-teal" href="/login">Back to login</Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
