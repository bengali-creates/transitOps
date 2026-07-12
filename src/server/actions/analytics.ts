"use server";

import { db } from "@/db";
import { fuelLogs, expenses, maintenanceLogs, vehicles, trips } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { sql, eq } from "drizzle-orm";

export async function getAnalyticsData() {
  await requirePermission("reports:read");

  // 1. Vehicles
  const allVehicles = await db.select().from(vehicles);
  
  // 2. Fuel
  const allFuel = await db.select().from(fuelLogs);
  
  // 3. Maintenance
  const allMaintenance = await db.select().from(maintenanceLogs);
  
  // 4. Expenses
  const allExpenses = await db.select().from(expenses);
  
  // 5. Trips
  const allTrips = await db.select().from(trips);

  // Aggregate Data
  let totalDistance = 0;
  allTrips.forEach(t => totalDistance += Number(t.actualDistance || t.plannedDistance || 0));
  
  let totalFuelLiters = 0;
  let totalFuelCost = 0;
  allFuel.forEach(f => {
    totalFuelLiters += Number(f.liters || 0);
    totalFuelCost += Number(f.cost || 0);
  });

  const fuelEfficiency = totalFuelLiters > 0 ? (totalDistance / totalFuelLiters) : 0;

  const activeVehicles = allVehicles.filter(v => v.status === "on_trip" || v.status === "available").length;
  const totalVehiclesCount = allVehicles.length;
  const fleetUtilization = totalVehiclesCount > 0 ? (activeVehicles / totalVehiclesCount) * 100 : 0;

  let totalMaintenanceCost = 0;
  allMaintenance.forEach(m => totalMaintenanceCost += Number(m.cost || 0));

  let totalOtherExpenses = 0;
  allExpenses.forEach(e => totalOtherExpenses += Number(e.amount || 0));

  const operationalCost = totalFuelCost + totalMaintenanceCost + totalOtherExpenses;

  // ROI per vehicle
  let totalRevenue = 0;
  allTrips.forEach(t => totalRevenue += Number(t.revenue || 0));
  
  let totalAcquisitionCost = 0;
  allVehicles.forEach(v => totalAcquisitionCost += Number(v.acquisitionCost || 0));

  const vehicleROI = totalAcquisitionCost > 0 ? ((totalRevenue - (totalMaintenanceCost + totalFuelCost)) / totalAcquisitionCost) * 100 : 0;

  // Group by vehicle for top costliest
  const vehicleCosts: Record<string, { name: string, totalCost: number, fuel: number, maintenance: number, expense: number, revenue: number, acquisitionCost: number }> = {};
  
  allVehicles.forEach(v => {
    vehicleCosts[v.id] = { name: v.name, totalCost: 0, fuel: 0, maintenance: 0, expense: 0, revenue: 0, acquisitionCost: Number(v.acquisitionCost || 0) };
  });

  allFuel.forEach(f => {
    if (vehicleCosts[f.vehicleId]) {
      vehicleCosts[f.vehicleId].fuel += Number(f.cost || 0);
      vehicleCosts[f.vehicleId].totalCost += Number(f.cost || 0);
    }
  });

  allMaintenance.forEach(m => {
    if (vehicleCosts[m.vehicleId]) {
      vehicleCosts[m.vehicleId].maintenance += Number(m.cost || 0);
      vehicleCosts[m.vehicleId].totalCost += Number(m.cost || 0);
    }
  });

  allExpenses.forEach(e => {
    if (e.vehicleId && vehicleCosts[e.vehicleId]) {
      vehicleCosts[e.vehicleId].expense += Number(e.amount || 0);
      vehicleCosts[e.vehicleId].totalCost += Number(e.amount || 0);
    }
  });
  
  allTrips.forEach(t => {
    if (t.vehicleId && vehicleCosts[t.vehicleId]) {
      vehicleCosts[t.vehicleId].revenue += Number(t.revenue || 0);
    }
  });

  const costliestVehicles = Object.values(vehicleCosts)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 5)
    .map(v => ({
      name: v.name,
      cost: v.totalCost
    }));
    
  const vehicleMetrics = Object.values(vehicleCosts).map(v => {
      const roi = v.acquisitionCost > 0 ? ((v.revenue - (v.maintenance + v.fuel)) / v.acquisitionCost) * 100 : 0;
      return {
          vehicle: v.name,
          cost: v.totalCost,
          roi: roi,
          efficiency: 0, 
      }
  });

  // Monthly Revenue (Mocking for now as we don't have enough data spread)
  const monthlyRevenue = [
    { name: 'Jan', value: Math.floor(totalRevenue * 0.1) },
    { name: 'Feb', value: Math.floor(totalRevenue * 0.15) },
    { name: 'Mar', value: Math.floor(totalRevenue * 0.12) },
    { name: 'Apr', value: Math.floor(totalRevenue * 0.18) },
    { name: 'May', value: Math.floor(totalRevenue * 0.16) },
    { name: 'Jun', value: Math.floor(totalRevenue * 0.2) },
    { name: 'Jul', value: Math.floor(totalRevenue * 0.09) },
  ];

  return {
    fuelEfficiency,
    fleetUtilization,
    operationalCost,
    vehicleROI,
    costliestVehicles,
    monthlyRevenue,
    vehicleMetrics
  };
}
