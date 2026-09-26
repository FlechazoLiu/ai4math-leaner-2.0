import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignIn } from "@/components/auth/SignIn";

export default async function Home() {
  const session = await auth();
  const user = session?.user;
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-black">Leaner</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left Side - Title and Sign Up Link */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
              Mathematics Learning Platform
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              A formal verification system for mathematical proofs and practice.
            </p>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Contact your administrator to get an account.
              </p>
            </div>
          </div>

          {/* Right Side - Sign In Form */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <SignIn />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
