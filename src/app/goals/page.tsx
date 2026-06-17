import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SavingGoals } from "@/components/goals/saving-goals";
import { getCurrentUser } from "@/lib/auth";

export default async function GoalsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/goals");
  }

  return (
    <AppShell active="goals" user={{ name: user.name, email: user.email }}>
      <SavingGoals />
    </AppShell>
  );
}
