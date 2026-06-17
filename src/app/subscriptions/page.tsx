import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SubscriptionTracker } from "@/components/subscriptions/subscription-tracker";
import { getCurrentUser } from "@/lib/auth";

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/subscriptions");
  }

  return (
    <AppShell active="subscriptions" user={{ name: user.name, email: user.email }}>
      <SubscriptionTracker />
    </AppShell>
  );
}
