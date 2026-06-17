import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FinancialPredictions } from "@/components/predictions/financial-predictions";
import { getCurrentUser } from "@/lib/auth";

export default async function PredictionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/predictions");
  }

  return (
    <AppShell active="predictions" user={{ name: user.name, email: user.email }}>
      <FinancialPredictions />
    </AppShell>
  );
}
