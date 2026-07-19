"use server";

import { db } from "@/db";
import { vehicles, trips, drivers } from "@/db/schema";
import { sql, eq, and, ilike } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";

export async function getDashboardStats(filters?: { type?: string, status?: string, region?: string, q?: string }) {
  await requirePermission("trip:read");

  const vehicleConditions = [];
  if (filters?.type && filters.type !== "all") vehicleConditions.push(ilike(vehicles.type, `%${filters.type}%`));
  if (filters?.status && filters.status !== "all") vehicleConditions.push(eq(vehicles.status, filters.status as any));
  if (filters?.region && filters.region !== "all") vehicleConditions.push(ilike(vehicles.region, filters.region));
  if (filters?.q) vehicleConditions.push(ilike(vehicles.registrationNumber, `%${filters.q}%`));

  const [vehicleStats] = await db
    .select({
      total: sql<number>`count(*)`,
      available: sql<number>`count(*) filter (where ${vehicles.status} = 'available')`,
      inShop: sql<number>`count(*) filter (where ${vehicles.status} = 'in_shop')`,
      onTrip: sql<number>`count(*) filter (where ${vehicles.status} = 'on_trip')`,
      retired: sql<number>`count(*) filter (where ${vehicles.status} = 'retired')`,
    })
    .from(vehicles)
    .where(vehicleConditions.length > 0 ? and(...vehicleConditions) : undefined);

  const [tripStats] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where ${trips.status} = 'dispatched')`,
      pending: sql<number>`count(*) filter (where ${trips.status} = 'draft')`,
    })
    .from(trips);

  const [driverStats] = await db
    .select({
      onDuty: sql<number>`count(*) filter (where ${drivers.status} = 'on_trip' or ${drivers.status} = 'available')`,
    })
    .from(drivers);

  const recentTrips = await db
    .select({
      id: trips.id,
      tripNumber: trips.id,
      vehicleName: vehicles.registrationNumber,
      driverName: drivers.name,
      status: trips.status,
      eta: trips.plannedDistance, 
    })
    .from(trips)
    .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .limit(5);

  return {
    vehicleStats,
    tripStats,
    driverStats,
    recentTrips,
  };
}

export async function getRecentTripsInfinite({ 
  pageParam = 0, 
  filters 
}: { 
  pageParam: number, 
  filters?: { type?: string, status?: string, region?: string, q?: string } 
}) {
  await requirePermission("trip:read");
  const limit = 10;
  const offset = pageParam * limit;
  const conditions = [];

  if (filters?.type && filters.type !== "all") {
    conditions.push(ilike(vehicles.type, `%${filters.type}%`));
  }
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(vehicles.status, filters.status as any));
  }
  if (filters?.region && filters.region !== "all") {
    conditions.push(ilike(vehicles.region, filters.region));
  }
  if (filters?.q) {
    conditions.push(ilike(vehicles.registrationNumber, `%${filters.q}%`));
  }

  const tripsQuery = db
    .select({
      id: trips.id,
      tripNumber: trips.id,
      vehicleName: vehicles.registrationNumber,
      driverName: drivers.name,
      status: trips.status,
      eta: trips.plannedDistance, 
    })
    .from(trips)
    .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
    .leftJoin(drivers, eq(trips.driverId, drivers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset);

  const data = await tripsQuery;

  return {
    data,
    nextPage: data.length === limit ? pageParam + 1 : undefined,
  };
}
