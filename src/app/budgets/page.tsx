import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BudgetPlanner } from "@/components/budget/budget-planner";
import { getCurrentUser } from "@/lib/auth";

export default async function BudgetsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/budgets");
  }

  return (
    <AppShell active="budgets" user={{ name: user.name, email: user.email }}>
      <BudgetPlanner />
    </AppShell>
  );
}
