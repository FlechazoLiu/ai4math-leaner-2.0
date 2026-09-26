"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  FileText,
  FolderOpen,
  Users,
  ClipboardCheck,
  Library,
  Settings,
  Play,
} from "lucide-react";
import type { Role } from "@/lib/gen/leaner/v1/leaner_pb";

// Role constants matching the proto enum
const ADMIN = 1;
const TEACHER = 2;
const ASSISTANT = 3;

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardSidebarProps {
  role: Role;
  username?: string;
}

export default function DashboardSidebar({ role, username }: DashboardSidebarProps) {
  const pathname = usePathname();

  // Build nav items based on role
  const navItems: { section?: string; items: NavItem[] }[] = [];

  // --- Learning section (all roles) ---
  const learningItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  ];

  // Course center (all roles)
  learningItems.push({
    href: "/dashboard/courses",
    label: "Courses",
    icon: <GraduationCap className="h-4 w-4" />,
  });

  // Exercise bank (all roles)
  learningItems.push({
    href: "/dashboard/exercises",
    label: "Exercises",
    icon: <BookOpen className="h-4 w-4" />,
  });

  // My answers (students only — teachers and assistants use the review workbench)
  if (role !== ASSISTANT && role !== TEACHER) {
    learningItems.push({
      href: "/dashboard/my-answers",
      label: "My Answers",
      icon: <FileText className="h-4 w-4" />,
    });
  }

  // Resources (all roles)
  learningItems.push({
    href: "/dashboard/resources",
    label: "Resources",
    icon: <FolderOpen className="h-4 w-4" />,
  });

  learningItems.push({
    href: "/dashboard/playground",
    label: "Playground",
    icon: <Play className="h-4 w-4" />,
  });

  navItems.push({ section: "Learning", items: learningItems });

  // --- Management section (TA/Teacher/Admin) ---
  if (role === ADMIN || role === TEACHER || role === ASSISTANT) {
    const mgmtItems: NavItem[] = [];

    mgmtItems.push({
      href: "/dashboard/review",
      label: "Review Workbench",
      icon: <ClipboardCheck className="h-4 w-4" />,
    });

    mgmtItems.push({
      href: "/dashboard/my-exercise",
      label: "Question Bank",
      icon: <Library className="h-4 w-4" />,
    });

    navItems.push({ section: "Teaching", items: mgmtItems });
  }

  // --- Admin section ---
  if (role === ADMIN) {
    navItems.push({
      section: "Administration",
      items: [
        {
          href: "/dashboard/users",
          label: "User Management",
          icon: <Users className="h-4 w-4" />,
        },
        {
          href: "/dashboard/admin/settings",
          label: "Settings",
          icon: <Settings className="h-4 w-4" />,
        },
      ],
    });
  }

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 text-white p-4 fixed h-screen overflow-y-auto shadow-xl flex flex-col">
      {/* Brand */}
      <Link href="/dashboard" className="text-2xl font-bold text-white mb-6 hover:text-blue-300 transition-colors">
        Leaner
      </Link>

      {/* User info */}
      {username && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-800">
          <p className="text-sm text-gray-400 truncate">{username}</p>
          <p className="text-xs text-gray-500">
            {role === ADMIN
              ? "Admin"
              : role === TEACHER
                ? "Teacher"
                : role === ASSISTANT
                  ? "Assistant"
                  : "Student"}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-5">
        {navItems.map((group) => (
          <div key={group.section}>
            <h3 className="px-3 mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.section}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-700">
        <p className="text-xs text-gray-500">v2.0.0</p>
      </div>
    </div>
  );
}
