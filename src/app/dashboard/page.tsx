import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {session.user?.name} ({session.user?.role}).
        </p>
      </div>

      <div className="flex gap-4">
        <form action={async () => {
          "use server";
          const { signOut } = await import("@/lib/auth");
          await signOut({ redirectTo: "/" });
        }}>
          <Button type="submit" variant="outline">Sign Out</Button>
        </form>
      </div>
    </div>
  );
}
