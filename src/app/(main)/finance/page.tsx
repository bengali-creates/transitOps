import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFuelLogs } from "@/server/actions/fuel";
import { getExpenses } from "@/server/actions/expenses";
import { listVehicles } from "@/server/actions/vehicles";
import { getAnalyticsData } from "@/server/actions/analytics";
import { FinanceClient } from "./finance-client";
import { db } from "@/db";
import { trips as tripsSchema } from "@/db/schema";
import { desc } from "drizzle-orm";

export default async function FinancePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  const role = (session.user as any).role;
  const { can } = await import("@/lib/rbac");
  
  if (!can(role, "finance:read")) {
    redirect("/");
  }

  const fuelLogs = await getFuelLogs();
  const expenses = await getExpenses();
  const vehicles = await listVehicles();
  const analytics = await getAnalyticsData();
  const trips = await db.query.trips.findMany({
    orderBy: [desc(tripsSchema.createdAt)],
  });
  const canWrite = can(role, "finance:write");

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <FinanceClient 
        initialFuelLogs={fuelLogs}
        initialExpenses={expenses}
        vehicles={vehicles}
        trips={trips}
        totalOperationalCost={analytics.operationalCost}
        canWrite={canWrite} 
      />
    </div>
  );
}
