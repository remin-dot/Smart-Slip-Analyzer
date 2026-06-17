import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GamificationPanel } from "@/components/gamification/gamification-panel";
import { getCurrentUser } from "@/lib/auth";

export default async function AchievementsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/achievements");
  }

  return (
    <AppShell active="achievements" user={{ name: user.name, email: user.email }}>
      <GamificationPanel />
    </AppShell>
  );
}
