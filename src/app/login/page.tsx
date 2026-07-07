import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="text-3xl font-bold tracking-tight">HLF Finance</div>
          <div className="mt-1 text-sm text-brand-100">
            Vehicle Loan Management · Hosur, Tamil Nadu
          </div>
        </div>
        <div className="card p-8">
          <h1 className="mb-6 text-lg font-semibold text-slate-900">Sign in</h1>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-brand-100">
          Demo logins are listed in the project README.
        </p>
      </div>
    </div>
  );
}
