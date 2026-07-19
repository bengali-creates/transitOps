import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getExpenses } from "@/server/actions/expenses";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  const role = (session.user as any).role;
  const { can } = await import("@/lib/rbac");
  
  if (!can(role, "finance:read")) {
    redirect("/");
  }

  const canWrite = can(role, "finance:write");

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <ExpensesClient canWrite={canWrite} />
    </div>
  );
}
