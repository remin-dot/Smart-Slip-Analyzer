import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FinanceChatPanel } from "@/components/chat/finance-chat";
import { getCurrentUser } from "@/lib/auth";

export default async function ChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/chat");
  }

  return (
    <AppShell active="chat" user={{ name: user.name, email: user.email, image: user.imageUrl }}>
      <FinanceChatPanel />
    </AppShell>
  );
}
