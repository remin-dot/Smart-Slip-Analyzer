import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManagedSubscriptions } from "@/components/subscriptions/managed-subscriptions";
import { SubscriptionTracker } from "@/components/subscriptions/subscription-tracker";
import { getCurrentUser } from "@/lib/auth";

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/subscriptions");
  }

  return (
    <AppShell active="subscriptions" user={{ name: user.name, email: user.email, image: user.imageUrl }}>
      <div className="grid gap-6">
        <ManagedSubscriptions />
        <SubscriptionTracker />
      </div>
    </AppShell>
  );
}
