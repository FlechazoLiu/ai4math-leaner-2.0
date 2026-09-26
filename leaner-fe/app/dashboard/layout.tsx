import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/");
  }

  // Force users who must change their password to do so first
  if (user.must_change_password) {
    redirect("/auth/change-password");
  }

  return (
    <DashboardShell role={user.role} username={user.name ?? undefined}>
      {children}
    </DashboardShell>
  );
}
