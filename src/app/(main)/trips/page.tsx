import { db } from "@/db";
import { trips, vehicles, drivers } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { desc } from "drizzle-orm";
import { TripClient } from "./trip-client";

export default async function TripsPage() {
  await requirePermission("trip:read");

  const [allTrips, allVehicles, allDrivers] = await Promise.all([
    db.query.trips.findMany({
      with: {
        vehicle: true,
        driver: true,
      },
      orderBy: [desc(trips.createdAt)],
    }),
    db.query.vehicles.findMany({
      orderBy: [desc(vehicles.createdAt)],
    }),
    db.query.drivers.findMany({
      orderBy: [desc(drivers.createdAt)],
    }),
  ]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <TripClient 
        initialTrips={allTrips} 
        vehicles={allVehicles} 
        drivers={allDrivers} 
      />
    </div>
  );
}
