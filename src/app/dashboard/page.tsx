import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <AppShell active="dashboard" user={{ name: user.name, email: user.email, image: user.imageUrl }} titleSuffix={user.name}>
      <div id="analytics">
        <AnalyticsDashboard />
      </div>
    </AppShell>
  );
}
