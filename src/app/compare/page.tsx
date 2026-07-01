import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReceiptCompare } from "@/components/compare/receipt-compare";
import { getCurrentUser } from "@/lib/auth";

export default async function ComparePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/compare");
  }

  return (
    <AppShell active="compare" user={{ name: user.name, email: user.email, image: user.imageUrl }}>
      <ReceiptCompare />
    </AppShell>
  );
}
