import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listDrivers } from "@/server/actions/drivers";
import { DriverClient } from "./driver-client";

export default async function DriversPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  const role = (session.user as any).role;
  const { can } = await import("@/lib/rbac");
  
  if (!can(role, "driver:read")) {
    redirect("/");
  }

  const drivers = await listDrivers();
  const canWrite = can(role, "driver:write");

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <DriverClient initialDrivers={drivers} canWrite={canWrite} />
    </div>
  );
}
