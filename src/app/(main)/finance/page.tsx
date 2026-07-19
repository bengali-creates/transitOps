import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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

  const analytics = await getAnalyticsData();
  const trips = await db.query.trips.findMany({
    orderBy: [desc(tripsSchema.createdAt)],
  });
  const canWrite = can(role, "finance:write");

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <FinanceClient 
        trips={trips}
        totalOperationalCost={analytics.operationalCost}
        canWrite={canWrite} 
      />
    </div>
  );
}
