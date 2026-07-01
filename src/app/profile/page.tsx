import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AvatarUploader } from "@/components/auth/avatar-uploader";
import { ProfileForm } from "@/components/auth/profile-form";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  return (
    <AppShell active="profile" user={{ name: user.name, email: user.email, image: user.imageUrl }}>
      <section className="panel grid gap-8 p-6 shadow-premium lg:grid-cols-[0.7fr_1.3fr]">
        <aside className="rounded-2xl border border-hairline bg-surface p-5 text-ink">
          <AvatarUploader name={user.name} image={user.imageUrl} />
          <h2 className="mt-6 text-2xl font-semibold">{user.name}</h2>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-xl border border-hairline bg-white p-3">
              <span className="block text-muted">Preference</span>
              <strong>{user.financialPreference}</strong>
            </div>
            <div className="rounded-xl border border-hairline bg-white p-3">
              <span className="block text-muted">Currency</span>
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
            currency: user.currency,
          }}
        />
      </section>
    </AppShell>
  );
}
