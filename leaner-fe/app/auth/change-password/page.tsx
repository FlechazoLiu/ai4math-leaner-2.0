"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { changePasswordOnFirstLogin } from "@/lib/grpc";
import { ChangePasswordOnFirstLoginRequest } from "@/lib/gen/leaner/v1/leaner_pb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If user doesn't need to change password, redirect to dashboard
    if (session?.user && !session.user.must_change_password) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!session?.user?.token) {
      setError("Authentication required. Please sign in again.");
      return;
    }

    try {
      setLoading(true);
      await changePasswordOnFirstLogin({
        userToken: session.user.token,
        newPassword: newPassword,
      } as ChangePasswordOnFirstLoginRequest);

      toast.success("Password changed successfully. Please sign in again.");
      await signOut({ redirect: false });
      router.push("/auth/signin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-center text-xl">
            <Lock className="h-5 w-5" />
            Change Your Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-6">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              This is your first login. Please set a new password to continue.
              Your initial password was your Student ID.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Changing password..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
