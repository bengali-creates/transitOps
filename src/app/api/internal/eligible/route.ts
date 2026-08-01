import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicles, drivers } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "vehicles" | "drivers"
    const cargoWeight = Number(searchParams.get("cargoWeight") || 0);
    const region = searchParams.get("region");

    if (type === "vehicles") {
      let query = db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.status, "available"),
            gte(vehicles.maxLoadCapacity, sql`${cargoWeight}::numeric`)
          )
        )
        .$dynamic();

      if (region) {
        query = query.where(eq(vehicles.region, region));
      }

      const results = await query;
      return NextResponse.json(results);
    }

    if (type === "drivers") {
      const today = new Date().toISOString().split("T")[0];
      let query = db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.status, "available"),
            gte(drivers.licenseExpiryDate, today)
          )
        )
        .$dynamic();

      if (region) {
        query = query.where(eq(drivers.region, region));
      }

      const results = await query;
      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Internal API error fetching eligible assets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
