import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { TransactionList } from "@/components/scanner/transaction-list";
import { getCurrentUser } from "@/lib/auth";

export default async function TransactionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/transactions");
  }

  return (
    <AppShell active="transactions" user={{ name: user.name, email: user.email, image: user.imageUrl }}>
      <TransactionList />
    </AppShell>
  );
}
