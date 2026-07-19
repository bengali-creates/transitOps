"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/server/actions/dashboard";
import { DashboardFilters } from "@/components/dashboard-filters";
import { DashboardRecentTrips } from "@/components/dashboard-recent-trips";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function DashboardClient() {
  const searchParams = useSearchParams();
  const filters = {
    type: searchParams.get("type") || undefined,
    status: searchParams.get("status") || undefined,
    region: searchParams.get("region") || undefined,
    q: searchParams.get("q") || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["dashboardStats", filters],
    queryFn: () => getDashboardStats(filters),
  });

  const { vehicleStats, tripStats, driverStats } = data || {};

  const activeVehiclesCount = Number(vehicleStats?.onTrip || 0);
  const availableVehiclesCount = Number(vehicleStats?.available || 0);
  const inMaintenanceCount = Number(vehicleStats?.inShop || 0);
  const activeTripsCount = Number(tripStats?.active || 0);
  const pendingTripsCount = Number(tripStats?.pending || 0);
  const driversOnDutyCount = Number(driverStats?.onDuty || 0);

  const chartData = [
    { name: "Available", value: availableVehiclesCount, fill: "var(--color-emerald-500)" },
    { name: "On Trip", value: activeVehiclesCount, fill: "var(--color-blue-500)" },
    { name: "In Shop", value: inMaintenanceCount, fill: "var(--color-orange-500)" },
    { name: "Retired", value: Number(vehicleStats?.retired || 0), fill: "var(--color-red-500)" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-7xl mx-auto w-full">
      <DashboardFilters />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="py-2 gap-1 shadow-none">
          <CardHeader className="px-3 py-1 pb-0">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Active Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-1">
            <div className="text-2xl font-semibold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : activeVehiclesCount}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2 gap-1 shadow-none">
          <CardHeader className="px-3 py-1 pb-0">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Available Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-1">
            <div className="text-2xl font-semibold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : availableVehiclesCount}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2 gap-1 shadow-none">
          <CardHeader className="px-3 py-1 pb-0">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              In Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-1">
            <div className="text-2xl font-semibold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `0${inMaintenanceCount}`}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2 gap-1 shadow-none">
          <CardHeader className="px-3 py-1 pb-0">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Active Trips
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-1">
            <div className="text-2xl font-semibold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : activeTripsCount}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2 gap-1 shadow-none">
          <CardHeader className="px-3 py-1 pb-0">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Pending Trips
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-1">
            <div className="text-2xl font-semibold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `0${pendingTripsCount}`}
            </div>
          </CardContent>
        </Card>

        <Card className="py-2 gap-1 shadow-none">
          <CardHeader className="px-3 py-1 pb-0">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Drivers On Duty
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-1">
            <div className="text-2xl font-semibold">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : driversOnDutyCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Recent Trips
          </h3>
          <DashboardRecentTrips filters={filters} />
        </div>

        {/* Charts Side Panel */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Vehicle Status
          </h3>
          <Card>
            <CardContent className="p-1 md:p-2">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
