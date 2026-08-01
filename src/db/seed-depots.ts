import "dotenv/config";
import { db } from "./index";
import { depots, depotEdges } from "./schema";

async function main() {
  console.log("Seeding depots...");

  // Seed 6 depots across regions
  const seededDepots = await db
    .insert(depots)
    .values([
      { id: "10000000-0000-0000-0000-000000000001", name: "Gandhinagar Depot GJ4", region: "North", latitude: "23.2156", longitude: "72.6369" },
      { id: "10000000-0000-0000-0000-000000000002", name: "Ahmedabad Hub West", region: "West", latitude: "23.0225", longitude: "72.5714" },
      { id: "10000000-0000-0000-0000-000000000003", name: "Vadodara Transit East", region: "East", latitude: "22.3072", longitude: "73.1812" },
      { id: "10000000-0000-0000-0000-000000000004", name: "Surat Logistics South", region: "South", latitude: "21.1702", longitude: "72.8311" },
      { id: "10000000-0000-0000-0000-000000000005", name: "Rajkot Yard Central", region: "Central", latitude: "22.3039", longitude: "70.8022" },
      { id: "10000000-0000-0000-0000-000000000006", name: "Bhavnagar Center Coast", region: "Coast", latitude: "21.7645", longitude: "72.1519" },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Seeded ${seededDepots.length} depots.`);

  console.log("Seeding depot edges (routes)...");
  // Seed edges, leaving some reachable only through hops
  // Gandhinagar <-> Ahmedabad (25km, toll 50)
  // Ahmedabad <-> Vadodara (110km, toll 150)
  // Vadodara <-> Surat (150km, toll 200)
  // Ahmedabad <-> Rajkot (220km, toll 100)
  // Rajkot <-> Bhavnagar (180km, toll 0)
  // Bhavnagar <-> Surat (directly unreachable by road without going through Vadodara/Rajkot, but let's connect Bhavnagar <-> Ahmedabad at 170km)
  await db
    .insert(depotEdges)
    .values([
      // Bidirectional edges represented as two directed rows
      { fromDepotId: "10000000-0000-0000-0000-000000000001", toDepotId: "10000000-0000-0000-0000-000000000002", distanceKm: "25.00", tollCost: "50.00" },
      { fromDepotId: "10000000-0000-0000-0000-000000000002", toDepotId: "10000000-0000-0000-0000-000000000001", distanceKm: "25.00", tollCost: "50.00" },

      { fromDepotId: "10000000-0000-0000-0000-000000000002", toDepotId: "10000000-0000-0000-0000-000000000003", distanceKm: "110.00", tollCost: "150.00" },
      { fromDepotId: "10000000-0000-0000-0000-000000000003", toDepotId: "10000000-0000-0000-0000-000000000002", distanceKm: "110.00", tollCost: "150.00" },

      { fromDepotId: "10000000-0000-0000-0000-000000000003", toDepotId: "10000000-0000-0000-0000-000000000004", distanceKm: "150.00", tollCost: "200.00" },
      { fromDepotId: "10000000-0000-0000-0000-000000000004", toDepotId: "10000000-0000-0000-0000-000000000003", distanceKm: "150.00", tollCost: "200.00" },

      { fromDepotId: "10000000-0000-0000-0000-000000000002", toDepotId: "10000000-0000-0000-0000-000000000005", distanceKm: "220.00", tollCost: "100.00" },
      { fromDepotId: "10000000-0000-0000-0000-000000000005", toDepotId: "10000000-0000-0000-0000-000000000002", distanceKm: "220.00", tollCost: "100.00" },

      { fromDepotId: "10000000-0000-0000-0000-000000000005", toDepotId: "10000000-0000-0000-0000-000000000006", distanceKm: "180.00", tollCost: "0.00" },
      { fromDepotId: "10000000-0000-0000-0000-000000000006", toDepotId: "10000000-0000-0000-0000-000000000005", distanceKm: "180.00", tollCost: "0.00" },

      { fromDepotId: "10000000-0000-0000-0000-000000000006", toDepotId: "10000000-0000-0000-0000-000000000002", distanceKm: "170.00", tollCost: "80.00" },
      { fromDepotId: "10000000-0000-0000-0000-000000000002", toDepotId: "10000000-0000-0000-0000-000000000006", distanceKm: "170.00", tollCost: "80.00" },
    ])
    .onConflictDoNothing();

  console.log("Depot seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
