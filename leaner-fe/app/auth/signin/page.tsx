import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignIn } from "@/components/auth/SignIn";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-black">Leaner</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
              Mathematics Learning Platform
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              A formal verification system for mathematical proofs and practice.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator to get an account.
            </p>
          </div>

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
