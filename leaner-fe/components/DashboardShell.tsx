"use client";

import { usePathname } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import SignOutButton from "@/components/SignOutButton";
import type { Role } from "@/lib/gen/leaner/v1/leaner_pb";

interface DashboardShellProps {
  children: React.ReactNode;
  role: Role;
  username?: string;
}

export default function DashboardShell({
  children,
  role,
  username,
}: DashboardShellProps) {
  const pathname = usePathname();
  const isFullscreen = pathname.includes("/submit");

  // Fullscreen mode: hide sidebar and header bar
  if (isFullscreen) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // Normal dashboard mode with sidebar
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar role={role} username={username} />

      <div className="flex-1 bg-gray-50 ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-300 px-6 py-4 shadow-sm sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Leaner</h1>
            <div className="flex items-center gap-3">
              {username && (
                <span className="text-sm text-gray-500">{username}</span>
              )}
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
