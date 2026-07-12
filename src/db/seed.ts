import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { roles, users, vehicles, drivers } from "./schema";


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

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
