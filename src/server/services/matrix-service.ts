import { db } from "@/db";
import { depots, depotEdges } from "@/db/schema";
import { randomUUID } from "crypto";

// ─── Simple LRU Cache Implementation ─────────────────────────────────────────
class SimpleLRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private max: number = 10) {}

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const matrixCache = new SimpleLRUCache<string, PrecomputedMatrix>(5);

let currentGraphVersion = randomUUID();

const FUEL_RATES: Record<string, number> = {
  "Truck": 0.35,
  "Mini Truck": 0.20,
  "Van": 0.15,
  "Ship": 1.50,
  "default": 0.25,
};

const FUEL_PRICE_PER_LITER = 96.7; // Rs per Liter GJ

interface PrecomputedMatrix {
  distances: number[][];
  nextNodes: (number | null)[][];
  tollCosts: number[][];
  indexToId: string[];
  idToIndex: Map<string, number>;
  graphVersion: string;
}


export async function getMatrix(): Promise<PrecomputedMatrix> {
  const cached = matrixCache.get(currentGraphVersion);
  if (cached) {
    return cached;
  }

  const allDepots = await db.select().from(depots);
  const allEdges = await db.select().from(depotEdges);

  const indexToId = allDepots.map((d) => d.id);
  const idToIndex = new Map<string, number>();
  indexToId.forEach((id, index) => idToIndex.set(id, index));

  const n = allDepots.length;

  const distances: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(Infinity)
  );
  const nextNodes: (number | null)[][] = Array.from({ length: n }, () =>
    Array(n).fill(null)
  );
  const tollCosts: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0)
  );

  for (let i = 0; i < n; i++) {
    distances[i][i] = 0;
  }

  for (const edge of allEdges) {
    const u = idToIndex.get(edge.fromDepotId);
    const v = idToIndex.get(edge.toDepotId);
    if (u !== undefined && v !== undefined) {
      const dist = Number(edge.distanceKm);
      const toll = Number(edge.tollCost || 0);

      if (dist < distances[u][v]) {
        distances[u][v] = dist;
        nextNodes[u][v] = v;
        tollCosts[u][v] = toll;
      }
    }
  }

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (distances[i][k] + distances[k][j] < distances[i][j]) {
          distances[i][j] = distances[i][k] + distances[k][j];
          nextNodes[i][j] = nextNodes[i][k];
          tollCosts[i][j] = tollCosts[i][k] + tollCosts[k][j];
        }
      }
    }
  }

  const precomputed: PrecomputedMatrix = {
    distances,
    nextNodes,
    tollCosts,
    indexToId,
    idToIndex,
    graphVersion: currentGraphVersion,
  };

  matrixCache.set(currentGraphVersion, precomputed);
  return precomputed;
}


export function invalidateCache() {
  currentGraphVersion = randomUUID();
  matrixCache.clear();
}

export async function estimateTrip(
  originId: string,
  destinationId: string,
  vehicleType: string
) {
  const matrix = await getMatrix();
  const u = matrix.idToIndex.get(originId);
  const v = matrix.idToIndex.get(destinationId);

  if (u === undefined || v === undefined) {
    throw new Error("Origin or destination depot not found in matrix");
  }

  const distance = matrix.distances[u][v];
  if (distance === Infinity) {
    return {
      reachable: false,
      distanceKm: 0,
      estimatedFuelLiters: 0,
      estimatedCost: 0,
      path: [],
      tollCost: 0,
    };
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: number | null = u;
  path.push(matrix.indexToId[curr]);

  while (curr !== v && curr !== null) {
    curr = matrix.nextNodes[curr][v];
    if (curr !== null) {
      path.push(matrix.indexToId[curr]);
    }
  }

  // Calculate fuel & cost
  const fuelRate = FUEL_RATES[vehicleType] ?? FUEL_RATES["default"];
  const estimatedFuel = distance * fuelRate;
  const toll = matrix.tollCosts[u][v];
  const fuelCost = estimatedFuel * FUEL_PRICE_PER_LITER;
  const totalCost = fuelCost + toll;

  return {
    reachable: true,
    distanceKm: distance,
    estimatedFuelLiters: Number(estimatedFuel.toFixed(2)),
    estimatedCost: Number(totalCost.toFixed(2)),
    path,
    tollCost: toll,
  };
}
