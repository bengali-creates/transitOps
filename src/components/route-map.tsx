"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

// Load Leaflet stylesheet dynamically on Mount to avoid SSR breakages
import "leaflet/dist/leaflet.css";

interface DepotPin {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
}

interface RouteMapProps {
  depots?: DepotPin[];
  primaryPathGeometry?: [number, number][];
  alternatePathGeometry?: [number, number][];
  connections?: [number, number][][];
  height?: string;
}

export default function RouteMap({
  depots = [],
  primaryPathGeometry = [],
  alternatePathGeometry = [],
  connections = [],
  height = "400px",
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Fix default Leaflet icon paths (Webpack/Next.js asset resolving issue)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    // 1. Initialize map centered in India (default transit location)
    const map = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);
    mapRef.current = map;

    // 2. Add OpenStreetMap Tile Layer (fully free tile provider)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Cleanup function to prevent double map instantiation on Strict Mode hot reloads
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers and Lines when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear previous paths
    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];

    const bounds: L.LatLngTuple[] = [];

    // Draw Depots
    depots.forEach((depot) => {
      const lat = Number(depot.latitude);
      const lng = Number(depot.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng])
          .addTo(map)
          .bindPopup(`<strong class="text-sm font-semibold">${depot.name}</strong>`);
        markersRef.current.push(marker);
        bounds.push([lat, lng]);
      }
    });

    // Draw Connections (Thin light-grey lines for background network overview)
    if (connections.length > 0) {
      connections.forEach((coords) => {
        if (coords.length > 0) {
          const polyline = L.polyline(coords, {
            color: "#94a3b8",
            weight: 2,
            opacity: 0.6,
          }).addTo(map);
          polylinesRef.current.push(polyline);
          coords.forEach((pt) => bounds.push(pt));
        }
      });
    }

    // Draw Primary Route (Solid Blue)
    if (primaryPathGeometry.length > 0) {
      const polyline = L.polyline(primaryPathGeometry, {
        color: "#2563eb",
        weight: 4.5,
        opacity: 0.9,
      }).addTo(map);
      polylinesRef.current.push(polyline);
      primaryPathGeometry.forEach((pt) => bounds.push(pt));
    }

    // Draw Alternate Route (Dashed Purple/Crimson Detour)
    if (alternatePathGeometry.length > 0) {
      const polyline = L.polyline(alternatePathGeometry, {
        color: "#d946ef",
        weight: 4.5,
        opacity: 0.9,
        dashArray: "8, 8",
      }).addTo(map);
      polylinesRef.current.push(polyline);
      alternatePathGeometry.forEach((pt) => bounds.push(pt));
    }

    // Fit map view bounds to encompass all visible markers and routes
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }, [depots, primaryPathGeometry, alternatePathGeometry, connections]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: "100%" }}
      className="rounded-lg border shadow-sm overflow-hidden bg-muted/40"
    />
  );
}
