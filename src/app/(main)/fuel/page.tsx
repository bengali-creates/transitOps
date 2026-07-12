import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFuelLogs } from "@/server/actions/fuel";
import { listVehicles } from "@/server/actions/vehicles";
import { FuelClient } from "./fuel-client";

export default async function FuelPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  const role = (session.user as any).role;
  const { can } = await import("@/lib/rbac");
  
  if (!can(role, "finance:read")) {
    redirect("/");
  }

  const logs = await getFuelLogs();
  const vehicles = await listVehicles();
  const canWrite = can(role, "finance:write");

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <FuelClient initialLogs={logs} vehicles={vehicles} canWrite={canWrite} />
    </div>
  );
}
