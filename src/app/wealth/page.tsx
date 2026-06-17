import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WealthTracker } from "@/components/wealth/wealth-tracker";
import { getCurrentUser } from "@/lib/auth";

export default async function WealthPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/wealth");
  }

  return (
    <AppShell active="wealth" user={{ name: user.name, email: user.email }}>
      <WealthTracker />
    </AppShell>
  );
}
