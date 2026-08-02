import { db } from "@/db";
import { depots, depotEdges } from "@/db/schema";

// ─── Simple LRU Cache Implementation ─────────────────────────────────────────
class SimpleLRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private max: number = 100) {} // Capacity 100 for individual routes

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

interface PrecomputedRoute {
  reachable: boolean;
  distanceKm: number;
  estimatedFuelLiters: number;
  estimatedCost: number;
  path: string[];
  tollCost: number;
  geometry: [number, number][];
}

// Cache mapped by individual routes: originId_destinationId_vehicleType
const matrixCache = new SimpleLRUCache<string, PrecomputedRoute>(100);

// Fuel rates per kilometer based on vehicle type
const FUEL_RATES: Record<string, number> = {
  "Truck": 0.35,
  "Mini Truck": 0.20,
  "Van": 0.15,
  "Ship": 1.50,
  "default": 0.25,
};

const FUEL_PRICE_PER_LITER = 96.7;

export function invalidateCache() {
  matrixCache.clear();
}

export async function estimateTrip(
  originId: string,
  destinationId: string,
  vehicleType: string
): Promise<PrecomputedRoute> {
  const cacheKey = `${originId}_${destinationId}_${vehicleType}`;
  const cached = matrixCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Run Dijkstra pathfinder dynamically
  const detourResult = await getDetourRoutes(originId, destinationId, []);

  if (!detourResult.reachable) {
    const result: PrecomputedRoute = {
      reachable: false,
      distanceKm: 0,
      estimatedFuelLiters: 0,
      estimatedCost: 0,
      path: [],
      tollCost: 0,
      geometry: [],
    };
    matrixCache.set(cacheKey, result);
    return result;
  }

  // Calculate fuel & cost metrics dynamically
  const fuelRate = FUEL_RATES[vehicleType] ?? FUEL_RATES["default"];
  const estimatedFuel = detourResult.distanceKm * fuelRate;
  const fuelCost = estimatedFuel * FUEL_PRICE_PER_LITER;
  const totalCost = fuelCost + detourResult.tollCost;

  const result: PrecomputedRoute = {
    reachable: true,
    distanceKm: detourResult.distanceKm,
    estimatedFuelLiters: Number(estimatedFuel.toFixed(2)),
    estimatedCost: Number(totalCost.toFixed(2)),
    path: detourResult.path,
    tollCost: detourResult.tollCost,
    geometry: detourResult.geometry as [number, number][],
  };

  matrixCache.set(cacheKey, result);
  return result;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) *Math.cos((lat2 * Math.PI) / 180) *Math.sin(dLon / 2) *Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Resolves true road distance and geometry coordinates from OpenRouteService,
 * with a fallback to the Haversine formula and straight-line geometry.
 */
export async function getRouteDistanceAndGeometry(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<{ distanceKm: number; geometry: string }> {
  const apiKey = process.env.ORS_API_KEY;
  if (apiKey) {
    try {
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${fromLon},${fromLat}&end=${toLon},${toLat}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const route = data.features?.[0];
        if (route) {
          const distanceKm = Number(
            (route.properties.summary.distance / 1000).toFixed(2)
          );
          const coords = route.geometry.coordinates.map(
            (pt: [number, number]) => [pt[1], pt[0]]
          );
          return {
            distanceKm,
            geometry: JSON.stringify(coords),
          };
        }
      }
    } catch (e) {
      console.warn(
        "Failed to fetch route from OpenRouteService, falling back to Haversine:",
        e
      );
    }
  }

const distanceKm = calculateHaversineDistance(
    fromLat,
    fromLon,
    toLat,
    toLon
  );
  const geometry = JSON.stringify([
    [fromLat, fromLon],
    [toLat, toLon],
  ]);
  return { distanceKm, geometry };
}

interface EdgeInfo {
  to: number;
  distance: number;
  toll: number;
  geometry: string | null;
  edgeId: string;
}

export async function getDetourRoutes(
  originId: string,
  destinationId: string,
  blockedEdgeIds: string[] = []
) {
  const allDepots = await db.select().from(depots);
  const allEdges = await db.select().from(depotEdges);

  const n = allDepots.length;
  const indexToId = allDepots.map((d) => d.id);
  const idToIndex = new Map<string, number>();
  indexToId.forEach((id, index) => idToIndex.set(id, index));

  const u = idToIndex.get(originId);
  const v = idToIndex.get(destinationId);
  if (u === undefined || v === undefined) {
    throw new Error("Origin or destination not found in graph");
  }

  const adjList: EdgeInfo[][] = Array.from({ length: n }, () => []);
  for (const edge of allEdges) {
    if (blockedEdgeIds.includes(edge.id)) {
      continue;
    }
    const fromIdx = idToIndex.get(edge.fromDepotId);
    const toIdx = idToIndex.get(edge.toDepotId);
    if (fromIdx !== undefined && toIdx !== undefined) {
      adjList[fromIdx].push({
        to: toIdx,
        distance: Number(edge.distanceKm),
        toll: Number(edge.tollCost || 0),
        geometry: edge.geometry,
        edgeId: edge.id,
      });
    }
  }

  const dist = Array(n).fill(Infinity);
  const prev = Array(n).fill(null);
  const prevEdgeGeometry = Array(n).fill(null);
  const toll = Array(n).fill(0);

  dist[u] = 0;
  const visited = Array(n).fill(false);

  for (let step = 0; step < n; step++) {
    let minDist = Infinity;
    let curr = -1;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < minDist) {
        minDist = dist[i];
        curr = i;
      }
    }

    if (curr === -1 || curr === v) break;
    visited[curr] = true;

    for (const neighbor of adjList[curr]) {
      if (dist[curr] + neighbor.distance < dist[neighbor.to]) {
        dist[neighbor.to] = dist[curr] + neighbor.distance;
        prev[neighbor.to] = curr;
        prevEdgeGeometry[neighbor.to] = neighbor.geometry;
        toll[neighbor.to] = toll[curr] + neighbor.toll;
      }
    }
  }

  if (dist[v] === Infinity) {
    return { reachable: false, distanceKm: 0, path: [], geometry: [] };
  }

  const pathIdx: number[] = [];
  let currNode = v;
  while (currNode !== null) {
    pathIdx.push(currNode);
    currNode = prev[currNode];
  }
  pathIdx.reverse();

  const path = pathIdx.map((idx) => indexToId[idx]);

  const fullGeometry: [number, number][] = [];
  for (let i = 0; i < pathIdx.length - 1; i++) {
    const nextNode = pathIdx[i + 1];
    const geomStr = prevEdgeGeometry[nextNode];
    if (geomStr) {
      try {
        const coords = JSON.parse(geomStr);
        fullGeometry.push(...coords);
      } catch (e) {
        const fromDepot = allDepots[pathIdx[i]];
        const toDepot = allDepots[nextNode];
        fullGeometry.push(
          [Number(fromDepot.latitude), Number(fromDepot.longitude)],
          [Number(toDepot.latitude), Number(toDepot.longitude)]
        );
      }
    } else {
      const fromDepot = allDepots[pathIdx[i]];
      const toDepot = allDepots[nextNode];
      fullGeometry.push(
        [Number(fromDepot.latitude), Number(fromDepot.longitude)],
        [Number(toDepot.latitude), Number(toDepot.longitude)]
      );
    }
  }

  return {
    reachable: true,
    distanceKm: Number(dist[v].toFixed(2)),
    tollCost: Number(toll[v].toFixed(2)),
    path,
    geometry: fullGeometry,
  };
}

