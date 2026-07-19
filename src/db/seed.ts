import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { roles, users, vehicles, drivers, trips, maintenanceLogs, fuelLogs, expenses } from "./schema";


async function main() {
  console.log("Seeding roles...");
  const roleRows = await db
    .insert(roles)
    .values([
      { name: "fleet_manager", description: "Oversees fleet assets and efficiency" },
      { name: "driver", description: "Creates trips and monitors deliveries" },
      { name: "safety_officer", description: "Tracks compliance and safety scores" },
      { name: "financial_analyst", description: "Reviews expenses and profitability" },
      { name: "admin", description: "System administrator with full access" },
    ])
    .onConflictDoNothing()
    .returning();

  const roleByName = new Map(roleRows.map((r) => [r.name, r.id]));
  const passwordHash = await bcrypt.hash("Password123!", 10);

  console.log("Seeding users...");
  await db
    .insert(users)
    .values([
      {
        name: "Fiona Manager",
        email: "manager@transitops.dev",
        role: "fleet_manager",
        roleId: roleByName.get("fleet_manager"),
        passwordHash,
      },
      {
        name: "Dan Driver",
        email: "driver@transitops.dev",
        role: "driver",
        roleId: roleByName.get("driver"),
        passwordHash,
      },
      {
        name: "Sam Safety",
        email: "safety@transitops.dev",
        role: "safety_officer",
        roleId: roleByName.get("safety_officer"),
        passwordHash,
      },
      {
        name: "Fay Finance",
        email: "finance@transitops.dev",
        role: "financial_analyst",
        roleId: roleByName.get("financial_analyst"),
        passwordHash,
      },
      {
        name: "Adam Admin",
        email: "admin@transitops.dev",
        role: "admin",
        roleId: roleByName.get("admin"),
        passwordHash,
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding vehicles...");
  await db
    .insert(vehicles)
    .values([
      {
        registrationNumber: "VAN-05",
        name: "Tata Ace",
        type: "Mini Truck",
        maxLoadCapacity: "500",
        odometer: "12000",
        acquisitionCost: "650000",
        region: "East",
        status: "available",
      },
      {
        registrationNumber: "TRK-11",
        name: "Ashok Leyland Dost",
        type: "Truck",
        maxLoadCapacity: "1500",
        odometer: "48000",
        acquisitionCost: "1200000",
        region: "North",
        status: "available",
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding drivers...");
  await db
    .insert(drivers)
    .values([
      {
        name: "Alex",
        licenseNumber: "WB-2027-0001",
        licenseCategory: "LMV",
        licenseExpiryDate: "2027-06-30",
        contactNumber: "+91-9000000001",
        safetyScore: 92,
        region: "East",
        status: "available",
      },
      {
        name: "Priya",
        licenseNumber: "DL-2026-0044",
        licenseCategory: "HMV",
        licenseExpiryDate: "2026-11-15",
        contactNumber: "+91-9000000002",
        safetyScore: 88,
        region: "North",
        status: "available",
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding trips and other operations...");
  const vRows = await db.select().from(vehicles);
  const dRows = await db.select().from(drivers);

  if (vRows.length > 0 && dRows.length > 0) {
    const statuses = ["draft", "dispatched", "completed", "cancelled"] as const;
    const maintenanceStatuses = ["open", "closed"] as const;
    const expenseTypes = ["fuel", "toll", "maintenance", "parking", "other"] as const;
    const regions = ["East", "West", "North", "South"];

    const newTrips = [];
    for (let i = 0; i < 30; i++) {
      const v = vRows[i % vRows.length];
      const d = dRows[i % dRows.length];
      const plannedDist = Math.floor(Math.random() * 200 + 10);
      const isCompleted = Math.random() > 0.5;
      newTrips.push({
        source: `Location ${i}`,
        destination: `Location ${i + 1}`,
        vehicleId: v.id,
        driverId: d.id,
        cargoWeight: Math.floor(Math.random() * 1000 + 100).toString(),
        plannedDistance: plannedDist.toString(),
        actualDistance: isCompleted ? (plannedDist + Math.random() * 5).toFixed(2) : null,
        startOdometer: (Number(v.odometer || 0) + i * 100).toString(),
        finalOdometer: isCompleted ? (Number(v.odometer || 0) + i * 100 + plannedDist).toString() : null,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        revenue: isCompleted ? (Math.random() * 500 + 50).toFixed(2) : null,
      });
    }

    const tripRows = await db.insert(trips).values(newTrips).returning();

    const newMaintenanceLogs = [];
    for (let i = 0; i < 15; i++) {
      const v = vRows[i % vRows.length];
      newMaintenanceLogs.push({
        vehicleId: v.id,
        type: ["Oil Change", "Brakes", "Tires", "Engine Check"][Math.floor(Math.random() * 4)],
        cost: (Math.random() * 300 + 50).toFixed(2),
        odometer: (Number(v.odometer || 0) + i * 500).toString(),
        status: maintenanceStatuses[Math.floor(Math.random() * maintenanceStatuses.length)],
      });
    }
    await db.insert(maintenanceLogs).values(newMaintenanceLogs);

    const newFuelLogs = [];
    const newExpenses = [];
    
    for (let i = 0; i < tripRows.length; i++) {
      const trip = tripRows[i];
      if (Math.random() > 0.3) {
        newFuelLogs.push({
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          liters: (Math.random() * 50 + 10).toFixed(2),
          cost: (Math.random() * 100 + 20).toFixed(2),
          odometer: trip.startOdometer,
          loggedDate: new Date().toISOString().split("T")[0],
        });
      }
      if (Math.random() > 0.5) {
        newExpenses.push({
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          type: expenseTypes[Math.floor(Math.random() * expenseTypes.length)],
          amount: (Math.random() * 50 + 5).toFixed(2),
          description: `Random expense ${i}`,
          incurredDate: new Date().toISOString().split("T")[0],
        });
      }
    }
    
    if (newFuelLogs.length > 0) await db.insert(fuelLogs).values(newFuelLogs);
    if (newExpenses.length > 0) await db.insert(expenses).values(newExpenses);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
