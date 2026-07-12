import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getExpenses } from "@/server/actions/expenses";
import { listVehicles } from "@/server/actions/vehicles";
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

  const logs = await getExpenses();
  const vehicles = await listVehicles();
  const canWrite = can(role, "finance:write");

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <ExpensesClient initialLogs={logs} vehicles={vehicles} canWrite={canWrite} />
    </div>
  );
}
