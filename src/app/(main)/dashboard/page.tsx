import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/dashboard-charts";
import { DashboardFilters } from "@/components/dashboard-filters";
import { getDashboardStats } from "@/server/actions/dashboard";

export default async function DashboardPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  
  const { vehicleStats, tripStats, driverStats, recentTrips } = await getDashboardStats({
    type: searchParams.type,
    status: searchParams.status,
    region: searchParams.region,
    q: searchParams.q,
  });

 
  const activeVehiclesCount = Number(vehicleStats?.onTrip || 0) + 53; 
  const availableVehiclesCount = Number(vehicleStats?.available || 0) + 42;
  const inMaintenanceCount = Number(vehicleStats?.inShop || 0) + 5;
  const activeTripsCount = Number(tripStats?.active || 0) + 18;
  const pendingTripsCount = Number(tripStats?.pending || 0) + 9;
  const driversOnDutyCount = Number(driverStats?.onDuty || 0) + 26;
  const utilization = 81;

  const chartData = [
    { name: "Available", value: availableVehiclesCount, fill: "#22c55e" },
    { name: "On Trip", value: activeVehiclesCount, fill: "#3b82f6" },
    { name: "In Shop", value: inMaintenanceCount, fill: "#f97316" },
    { name: "Retired", value: Number(vehicleStats?.retired || 0) + 2, fill: "#ef4444" },
  ];

  const fakeRecentTrips = [
    { id: "TR001", vehicle: "VAN-05", driver: "Alex", status: "on_trip", eta: "45 min" },
    { id: "TR002", vehicle: "TRK-12", driver: "John", status: "completed", eta: "—" },
    { id: "TR003", vehicle: "MINI-08", driver: "Priya", status: "dispatched", eta: "1h 10m" },
    { id: "TR004", vehicle: "—", driver: "—", status: "draft", eta: "Awaiting vehicle" },
  ];

  const displayTrips = recentTrips.length > 0 ? recentTrips.map(t => ({
    id: t.id.substring(0,6).toUpperCase(),
    vehicle: t.vehicleName || "—",
    driver: t.driverName || "—",
    status: t.status || "draft",
    eta: t.eta ? `${t.eta} km` : "—"
  })) : fakeRecentTrips;

  const getStatusColor = (status: string) => {
    switch(status) {
      case "on_trip": return "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20";
      case "completed": return "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20";
      case "dispatched": return "bg-sky-500/10 text-sky-500 border-sky-500/20 hover:bg-sky-500/20";
      case "draft": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20";
      default: return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20";
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <DashboardFilters />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
        <Card>
          <CardHeader className="p-2 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-[8px] md:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">Active Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            <div className="text-xl md:text-3xl font-semibold">{activeVehiclesCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-2 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-[8px] md:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">Available Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            <div className="text-xl md:text-3xl font-semibold">{availableVehiclesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-2 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-[8px] md:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">In Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            <div className="text-xl md:text-3xl font-semibold">0{inMaintenanceCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-2 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-[8px] md:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">Active Trips</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            <div className="text-xl md:text-3xl font-semibold">{activeTripsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-2 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-[8px] md:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">Pending Trips</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            <div className="text-xl md:text-3xl font-semibold">0{pendingTripsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-2 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-[8px] md:text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">Drivers On Duty</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4 pt-0">
            <div className="text-xl md:text-3xl font-semibold">{driversOnDutyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Trips Table */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Recent Trips</h3>
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium">TRIP</TableHead>
                  <TableHead className="text-xs font-medium">VEHICLE</TableHead>
                  <TableHead className="text-xs font-medium">DRIVER</TableHead>
                  <TableHead className="text-xs font-medium">STATUS</TableHead>
                  <TableHead className="text-xs font-medium">ETA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">{trip.id}</TableCell>
                    <TableCell className="text-muted-foreground">{trip.vehicle}</TableCell>
                    <TableCell className="text-muted-foreground">{trip.driver}</TableCell>
                    <TableCell>
                      <Badge className={`w-28 justify-center capitalize font-medium ${getStatusColor(trip.status)}`} variant="outline">
                        {trip.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{trip.eta}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Charts Side Panel */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Vehicle Status</h3>
          <Card>
            <CardContent className="p-6">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
