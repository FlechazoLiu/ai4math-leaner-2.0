import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listUsers } from "@/lib/grpc";
import type { ListUsersRequest } from "@/lib/gen/leaner/v1/leaner_pb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, BookOpen, Server } from "lucide-react";

export default async function AdminSettingsPage() {
  const session = await auth();
  const user = session?.user;

  if (!user || user.role !== 1) {
    redirect("/dashboard");
  }

  // Fetch system stats
  let userCount = 0;
  let verifierStatus = "Not Deployed";
  try {
    const resp = await listUsers({ pageSize: 1, pageToken: "" } as ListUsersRequest);
    userCount = resp.totalCount;
  } catch { /* ignore */ }

  // Check verifier health directly
  try {
    const healthResp = await fetch(`http://verifier:8030/health`, { signal: AbortSignal.timeout(5000) });
    if (healthResp.ok) {
      const data = await healthResp.json();
      verifierStatus = data.status === "healthy" ? "Healthy" : "Starting...";
    }
  } catch {
    verifierStatus = "Not Deployed (use --profile verifier to enable)";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Admin Control Panel</p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registered Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verifier Status
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${verifierStatus.includes("Not Deployed") ? "bg-yellow-500" : "bg-green-500"}`} />
              <span className="text-sm">{verifierStatus}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lean Version
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">v4.22.0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deployment Mode
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-xs">
              {verifierStatus.includes("Not Deployed") ? "Basic Mode" : "Full Mode"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Link href="/dashboard/users" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <span className="font-medium">User Management</span>
              <p className="text-muted-foreground text-xs mt-1">Manage user roles, reset passwords</p>
            </Link>
            <Link href="/dashboard/courses/create" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <span className="font-medium">Create Course</span>
              <p className="text-muted-foreground text-xs mt-1">Create a new course</p>
            </Link>
            <Link href="/dashboard/resources" className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <span className="font-medium">Resource Management</span>
              <p className="text-muted-foreground text-xs mt-1">Manage learning resource links</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Deploy Info */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Enable Verifier:</span>
              <code className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                docker compose --profile verifier up -d
              </code>
            </p>
            <p>
              <span className="font-medium">Default (no verifier):</span>
              <code className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                docker compose up -d
              </code>
            </p>
            <p className="text-muted-foreground text-xs mt-3">
              Verifier needs 4GB+ RAM. On servers with 2GB RAM, use the basic deployment mode. Student-submitted Lean code will remain &ldquo;Pending Verification&rdquo; status, and assistants can manually grade it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
