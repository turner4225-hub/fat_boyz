import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Already signed in? Go straight to the dashboard.
  if (await getUser()) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <LoginForm />
    </main>
  );
}
