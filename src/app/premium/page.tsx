import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PremiumDashboard } from "@/components/dashboard/premium-dashboard";
import { getCurrentUser } from "@/lib/auth";

export default async function PremiumPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/premium");
  }

  return (
    <AppShell active="premium" user={{ name: user.name, email: user.email }} dark>
      <PremiumDashboard />
    </AppShell>
  );
}
