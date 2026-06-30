import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PurchaseAdvisor } from "@/components/purchase/purchase-advisor";
import { getCurrentUser } from "@/lib/auth";

export default async function PurchasePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/purchase");
  }

  return (
    <AppShell active="purchase" user={{ name: user.name, email: user.email, image: user.imageUrl }}>
      <PurchaseAdvisor />
    </AppShell>
  );
}
