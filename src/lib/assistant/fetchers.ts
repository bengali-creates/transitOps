import { db } from "@/db";
import { drivers, vehicles } from "@/db/schema";
import { sql, asc, desc, lte } from "drizzle-orm";
import { addDays } from "date-fns";

export async function fetchLicenceExpiries(withinDays: number) {
  const targetDate = addDays(new Date(), withinDays);
  
  const results = await db
    .select({
      id: drivers.id,
      name: drivers.name,
      licenceExpiry: drivers.licenseExpiryDate,
    })
    .from(drivers)
    .where(lte(drivers.licenseExpiryDate, targetDate.toISOString().split('T')[0]));
  
  return results.map(r => ({
    id: r.id,
    name: r.name,
    licence_expiry: r.licenceExpiry,
  }));
}

export async function fetchFleetUtilization(period: "today" | "week" | "month") {
  // Mock utilization logic based on current vehicle statuses for this assistant
  const results = await db
    .select({
      status: vehicles.status,
      count: sql<number>`count(*)`,
    })
    .from(vehicles)
    .groupBy(vehicles.status);

  let onTrip = 0;
  let available = 0;
  let inShop = 0;
  let total = 0;

  for (const row of results) {
    const c = Number(row.count);
    total += c;
    if (row.status === "on_trip") onTrip += c;
    if (row.status === "available") available += c;
    if (row.status === "in_shop") inShop += c;
  }

  const utilization_pct = total > 0 ? (onTrip / total) * 100 : 0;

  return {
    period,
    utilization_pct: utilization_pct.toFixed(1) + "%",
    on_trip: onTrip,
    available: available,
    in_shop: inShop,
    total_vehicles: total,
  };
}

export async function fetchHighCostVehicles(topN: number, costType: "fuel" | "maintenance" | "total") {
  // M13 Simplified: returns top vehicles by descending cost per distance.
  const results = await db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      registration: vehicles.registrationNumber,
      acquisitionCost: vehicles.acquisitionCost,
    })
    .from(vehicles)
    .orderBy(desc(vehicles.acquisitionCost))
    .limit(topN);

  return results.map(r => ({
    vehicle_id: r.id,
    vehicle_name: r.name,
    registration: r.registration,
    acquisition_cost: r.acquisitionCost,
  }));
}

export async function fetchDriverSafetyRanking(threshold?: number, order: "asc" | "desc" = "asc") {
  let query = db.select({
      id: drivers.id,
      name: drivers.name,
      safetyScore: drivers.safetyScore,
      status: drivers.status,
    })
    .from(drivers)
    .$dynamic();

  if (threshold !== undefined) {
    query = query.where(lte(drivers.safetyScore, threshold));
  }

  query = query.orderBy(order === "asc" ? asc(drivers.safetyScore) : desc(drivers.safetyScore)).limit(10);

  const results = await query;
  return results.map(r => ({
    driver_id: r.id,
    name: r.name,
    safety_score: r.safetyScore,
    status: r.status,
  }));
}

export async function fetchVehicleStatus(status: "available" | "on_trip" | "in_shop" | "retired") {
  const results = await db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      registration: vehicles.registrationNumber,
    })
    .from(vehicles)
    .where(sql`${vehicles.status} = ${status}`);

  return results.map(r => ({
    vehicle_id: r.id,
    name: r.name,
    registration: r.registration,
    status,
  }));
}
