"use client";

import React, { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getRecentTripsInfinite } from "@/server/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

export function DashboardRecentTrips({ filters }: { filters?: { type?: string, status?: string, region?: string, q?: string } }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["recentTrips", filters],
    queryFn: async ({ pageParam = 0 }) => {
      return getRecentTripsInfinite({ pageParam, filters });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: null, rootMargin: "20px", threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "on_trip":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20";
      case "dispatched":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20";
      case "draft":
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20";
    }
  };

  const displayTrips = data?.pages.flatMap((page) => page.data).map((t) => ({
    id: t.id.substring(0, 6).toUpperCase(),
    vehicle: t.vehicleName || "—",
    driver: t.driverName || "—",
    status: t.status || "draft",
    eta: t.eta ? `${t.eta} km` : "—",
  })) || [];

  return (
    <div className="rounded-md border bg-card">
      <ScrollArea className="h-[52vh]">
        <Table className="min-w-[400px]">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="text-[10px] md:text-xs font-medium py-1 px-3 h-8 sticky top-0 bg-background z-10">
                TRIP
              </TableHead>
              <TableHead className="text-[10px] md:text-xs font-medium py-1 px-3 h-8 sticky top-0 bg-background z-10">
                VEHICLE
              </TableHead>
              <TableHead className="text-[10px] md:text-xs font-medium py-1 px-3 h-8 sticky top-0 bg-background z-10">
                DRIVER
              </TableHead>
              <TableHead className="text-[10px] md:text-xs font-medium py-1 px-3 h-8 sticky top-0 bg-background z-10">
                STATUS
              </TableHead>
              <TableHead className="text-[10px] md:text-xs font-medium py-1 px-3 h-8 sticky top-0 bg-background z-10">
                ETA
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === "pending" ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : displayTrips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No trips found.
                </TableCell>
              </TableRow>
            ) : (
              displayTrips.map((trip, idx) => (
                <TableRow key={`${trip.id}-${idx}`}>
                  <TableCell className="font-medium">{trip.id}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {trip.vehicle}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {trip.driver}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`w-28 justify-center capitalize font-medium ${getStatusColor(trip.status)}`}
                      variant="outline"
                    >
                      {trip.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs py-1 px-3">
                    {trip.eta}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Intersection observer target for infinite scroll */}
        <div ref={loadMoreRef} className="h-4 w-full flex items-center justify-center py-4">
          {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </ScrollArea>
    </div>
  );
}
