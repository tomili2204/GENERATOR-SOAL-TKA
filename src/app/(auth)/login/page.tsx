import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 relative overflow-hidden">
      {/* Subtle brand background elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-100/50 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full flex justify-center">
        <LoginForm />
      </div>
    </main>
  );
}
