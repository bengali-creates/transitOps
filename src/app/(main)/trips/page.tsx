import { db } from "@/db";
import { trips, vehicles, drivers } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { TripClient } from "./trip-client";

export default async function TripsPage() {
  await requirePermission("trip:read");

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <TripClient />
    </div>
  );
}
