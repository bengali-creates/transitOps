import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listVehicles } from "@/server/actions/vehicles";
import { VehicleClient } from "./vehicle-client";

export default async function VehiclesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  const role = (session.user as any).role;
  const { can } = await import("@/lib/rbac");
  
  if (!can(role, "vehicle:read")) {
    redirect("/");
  }

  const canWrite = can(role, "vehicle:write");

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <VehicleClient canWrite={canWrite} />
    </div>
  );
}
