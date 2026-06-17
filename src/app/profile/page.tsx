import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { ProfileForm } from "@/components/auth/profile-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-8">
      <section className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="inline-flex items-center gap-2 text-sm font-extrabold text-muted" href="/dashboard">
              <ArrowLeft size={17} /> Back to dashboard
            </Link>
            <p className="eyebrow mt-6">User profile</p>
            <h1 className="mt-2 text-4xl font-black">Financial preferences</h1>
          </div>
          <LogoutButton />
        </header>

        <section className="panel mt-6 grid gap-8 p-6 shadow-premium lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="rounded-lg bg-[#102c3a] p-5 text-white">
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-white/10">
              <UserRound size={30} />
            </div>
            <h2 className="mt-6 text-2xl font-black">{user.name}</h2>
            <p className="mt-2 text-sm font-semibold text-white/65">{user.email}</p>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="rounded-lg bg-white/10 p-3">
                <span className="block text-white/60">Preference</span>
                <strong>{user.financialPreference}</strong>
              </div>
              <div className="rounded-lg bg-white/10 p-3">
                <span className="block text-white/60">Currency</span>
                <strong>{user.currency}</strong>
              </div>
            </div>
          </aside>

          <ProfileForm
            user={{
              name: user.name,
              email: user.email,
              monthlyIncome: user.monthlyIncome.toString(),
              savingGoal: user.savingGoal.toString(),
              financialPreference: user.financialPreference,
              currency: user.currency
            }}
          />
        </section>
      </section>
    </main>
  );
}
