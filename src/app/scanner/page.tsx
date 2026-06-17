import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SlipUpload } from "@/components/scanner/slip-upload";
import { getCurrentUser } from "@/lib/auth";

export default async function ScannerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/scanner");
  }

  return (
    <AppShell active="scanner" user={{ name: user.name, email: user.email }}>
      <SlipUpload />
    </AppShell>
  );
}
