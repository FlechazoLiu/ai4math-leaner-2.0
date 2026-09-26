"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ChangeUsernameRequest } from "@/lib/gen/leaner/v1/leaner_pb";
import { changeUsername } from "@/lib/grpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ChangeUsername() {
  const [newUsername, setNewUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const request = {
        userToken: session?.user?.token || "",
        newUsername: newUsername,
        password: password,
      } as ChangeUsernameRequest;

      await changeUsername(request);

      toast.success(
        "Username changed successfully! Please log in again with your new username.",
      );

      // Sign out to force re-login with new username
      await signOut({ callbackUrl: "/auth/signin" });
    } catch (error) {
      console.error("Error changing username:", error);
      toast.error(`Failed to change username: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Change Username</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update your display name for your account
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Username Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeUsername} className="space-y-6">
              {/* Current Username Display */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Current Username
                </Label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
                  {session?.user?.name || "Loading..."}
                </div>
              </div>

              {/* New Username Input */}
              <div className="space-y-2">
                <Label htmlFor="newUsername">New Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    id="newUsername"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    placeholder="Enter your new username"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password to confirm"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Please enter your current password to confirm this change
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting || !newUsername.trim() || !password.trim()
                  }
                  className="flex-1"
                >
                  {isSubmitting ? "Changing..." : "Change Username"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cancel
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Your username is displayed to other users when you submit answers or
            comments.
          </p>
        </div>
      </div>
    </div>
  );
}
