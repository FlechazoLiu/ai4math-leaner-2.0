"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Key, LogIn } from "lucide-react";

export function SignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const login = (formData.get("login") as string).trim();
    const password = formData.get("password") as string;

    if (!login || !password) {
      setError("Please enter your login and password");
      setLoading(false);
      return;
    }

    try {
      const isEmail = login.includes("@");
      const credentials: Record<string, string> = { password };
      if (isEmail) {
        credentials.email = login;
      } else {
        credentials.student_id = login;
      }

      const result = await signIn("credentials", {
        ...credentials,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <label htmlFor="login" className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" />
            Email or Student ID
          </label>
          <input
            id="login"
            name="login"
            type="text"
            required
            autoFocus
            className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="email@example.com or student_id"
          />
          <p className="text-xs text-gray-400">Enter your email address or student ID</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Key className="h-4 w-4 text-gray-400" />
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Enter your password"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <LogIn className="h-4 w-4" />
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
