import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MaintenanceClient } from "./maintenance-client";
import { listMaintenanceLogs } from "@/server/actions/maintenance";
import { listVehicles } from "@/server/actions/vehicles";
import { can } from "@/lib/rbac";

export const metadata = {
  title: "Maintenance | TransitOps",
};

export default async function MaintenancePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const role = (session.user as any).role;
  if (!can(role, "maintenance:read")) {
    redirect("/dashboard");
  }

  const canWrite = can(role, "maintenance:write");

  return (
    <div className="flex h-full w-full flex-col">
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <MaintenanceClient 
          canWrite={canWrite} 
        />
      </main>
    </div>
  );
}
