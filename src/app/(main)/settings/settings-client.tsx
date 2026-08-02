"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { updateSettings } from "@/server/actions/settings";
import { createDepot, createEdge, deleteEdge, listDepots, listEdges } from "@/server/actions/depots";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Trash2, Plus, Route, Warehouse, Shield, Settings } from "lucide-react";

const RouteMap = dynamic(() => import("@/components/route-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full rounded-lg border bg-muted/40 animate-pulse flex items-center justify-center text-muted-foreground text-sm font-medium">
      Loading transit route map...
    </div>
  ),
});

const RBAC_DATA = [
  { role: "Fleet Manager", fleet: "✓", drivers: "✓", trips: "-", fuelExp: "-", analytics: "✓" },
  { role: "Dispatcher", fleet: "View", drivers: "-", trips: "✓", fuelExp: "-", analytics: "-" },
  { role: "Safety Officer", fleet: "-", drivers: "✓", trips: "View", fuelExp: "-", analytics: "-" },
  { role: "Financial Analyst", fleet: "View", drivers: "-", trips: "-", fuelExp: "✓", analytics: "✓" },
  { role: "Admin", fleet: "✓", drivers: "✓", trips: "✓", fuelExp: "✓", analytics: "✓" },
];

export function SettingsClient({ initialSettings, userRole }: { initialSettings: any, userRole: string }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Queries for Depots and Edges
  const { data: depotsList = [] } = useQuery({
    queryKey: ["depots"],
    queryFn: () => listDepots(),
  });

  const { data: edgesList = [] } = useQuery({
    queryKey: ["edges"],
    queryFn: () => listEdges(),
  });

  // Mutations
  const addDepotMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await createDepot(formData);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["depots"] });
      toast.success("Depot created successfully.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create depot.");
    },
  });

  const addEdgeMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await createEdge(formData);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edges"] });
      toast.success("Route edge created successfully.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create route edge.");
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: async (edgeId: string) => {
      const res = await deleteEdge(edgeId);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["edges"] });
      toast.success("Route edge deleted successfully.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete route edge.");
    },
  });

  async function onSaveGeneral(formData: FormData) {
    setLoading(true);
    const result = await updateSettings(formData);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Settings saved successfully.");
    }
  }

  const isAdmin = userRole === "admin";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">System Settings & Controls</h2>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="rbac" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>RBAC Matrix</span>
          </TabsTrigger>
          <TabsTrigger value="depots" className="flex items-center gap-2">
            <Warehouse className="w-4 h-4" />
            <span>Depots & Routes</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="space-y-4">
          <div className="rounded-xl border bg-card p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-foreground uppercase tracking-wide text-sm">General Settings</h3>
            <form action={onSaveGeneral} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depotName" className="uppercase text-xs text-muted-foreground">Main Depot Name</Label>
                <Input
                  id="depotName"
                  name="depotName"
                  defaultValue={initialSettings?.depotName || ""}
                  disabled={!isAdmin}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="uppercase text-xs text-muted-foreground">Currency Symbol</Label>
                <Input
                  id="currency"
                  name="currency"
                  defaultValue={initialSettings?.currency || ""}
                  disabled={!isAdmin}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distanceUnit" className="uppercase text-xs text-muted-foreground">Distance Unit</Label>
                <Input
                  id="distanceUnit"
                  name="distanceUnit"
                  defaultValue={initialSettings?.distanceUnit || ""}
                  disabled={!isAdmin}
                  className="bg-background/50"
                />
              </div>
              {isAdmin && (
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </form>
          </div>
        </TabsContent>

        {/* Tab 2: RBAC Matrix */}
        <TabsContent value="rbac" className="space-y-4">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground uppercase tracking-wide text-sm">Role-Based Access Control Matrix</h3>
            <div className="rounded-md border border-border/50 overflow-hidden bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-border/50">
                    <TableHead className="uppercase text-xs font-medium w-[180px]">Role</TableHead>
                    <TableHead className="uppercase text-xs font-medium">Fleet Registry</TableHead>
                    <TableHead className="uppercase text-xs font-medium">Drivers</TableHead>
                    <TableHead className="uppercase text-xs font-medium">Trips & Dispatch</TableHead>
                    <TableHead className="uppercase text-xs font-medium">Fuel & Expenses</TableHead>
                    <TableHead className="uppercase text-xs font-medium">Analytics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RBAC_DATA.map((row) => (
                    <TableRow key={row.role} className="border-b-border/50">
                      <TableCell className="font-semibold text-sm">{row.role}</TableCell>
                      <TableCell>{row.fleet}</TableCell>
                      <TableCell>{row.drivers}</TableCell>
                      <TableCell>{row.trips}</TableCell>
                      <TableCell>{row.fuelExp}</TableCell>
                      <TableCell>{row.analytics}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Depot & Route Management */}
        <TabsContent value="depots" className="space-y-6">
          {/* Visual Route Map */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Transit Network Map</h3>
            <RouteMap
              depots={depotsList}
              connections={edgesList.map((edge: any) => {
                const from = depotsList.find((d: any) => d.id === edge.fromDepotId);
                const to = depotsList.find((d: any) => d.id === edge.toDepotId);
                if (!from || !to) return [];
                if (edge.geometry) {
                  try {
                    return JSON.parse(edge.geometry);
                  } catch (e) {
                    return [
                      [Number(from.latitude), Number(from.longitude)],
                      [Number(to.latitude), Number(to.longitude)]
                    ];
                  }
                }
                return [
                  [Number(from.latitude), Number(from.longitude)],
                  [Number(to.latitude), Number(to.longitude)]
                ];
              }).filter((c: any) => c.length > 0)}
              height="350px"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Create Depot */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Warehouse className="w-5 h-5 text-blue-500" />
                <span>Add New Depot</span>
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addDepotMutation.mutate(new FormData(e.currentTarget));
                  e.currentTarget.reset();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label className="uppercase text-[10px] text-muted-foreground">Depot Name</Label>
                  <Input name="name" placeholder="e.g. Pune Hub Central" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="uppercase text-[10px] text-muted-foreground">Region</Label>
                  <Input name="region" placeholder="e.g. West, South" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="uppercase text-[10px] text-muted-foreground">Latitude</Label>
                    <Input name="latitude" type="number" step="any" placeholder="18.5204" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="uppercase text-[10px] text-muted-foreground">Longitude</Label>
                    <Input name="longitude" type="number" step="any" placeholder="73.8567" required />
                  </div>
                </div>
                <Button type="submit" disabled={addDepotMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Depot
                </Button>
              </form>
            </div>

            {/* Create Route Edge */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Route className="w-5 h-5 text-indigo-500" />
                <span>Connect Depots (Route Edge)</span>
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addEdgeMutation.mutate(new FormData(e.currentTarget));
                  e.currentTarget.reset();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="uppercase text-[10px] text-muted-foreground">From Depot</Label>
                    <select name="fromDepotId" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                      <option value="">Select Origin</option>
                      {depotsList.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="uppercase text-[10px] text-muted-foreground">To Depot</Label>
                    <select name="toDepotId" className="w-full rounded-md border bg-background px-3 py-2 text-sm" required>
                      <option value="">Select Destination</option>
                      {depotsList.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="uppercase text-[10px] text-muted-foreground">Distance (km)</Label>
                    <Input name="distanceKm" type="number" step="any" placeholder="120" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="uppercase text-[10px] text-muted-foreground">Toll Cost</Label>
                    <Input name="tollCost" type="number" step="any" placeholder="150" />
                  </div>
                </div>
                <Button type="submit" disabled={addEdgeMutation.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Create Connection
                </Button>
              </form>
            </div>

          </div>

          {/* Depots List Table */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Depots Directory</h3>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Coordinates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depotsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No depots configured.</TableCell>
                    </TableRow>
                  ) : (
                    depotsList.map((depot: any) => (
                      <TableRow key={depot.id}>
                        <TableCell className="font-semibold">{depot.name}</TableCell>
                        <TableCell>{depot.region}</TableCell>
                        <TableCell className="font-mono text-xs">{Number(depot.latitude).toFixed(4)}, {Number(depot.longitude).toFixed(4)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Edges List Table */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Network Route Connections</h3>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Depot</TableHead>
                    <TableHead>To Depot</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Toll Cost</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {edgesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No connections configured.</TableCell>
                    </TableRow>
                  ) : (
                    edgesList.map((edge: any) => {
                      const fromDepot = depotsList.find((d: any) => d.id === edge.fromDepotId)?.name || "Unknown";
                      const toDepot = depotsList.find((d: any) => d.id === edge.toDepotId)?.name || "Unknown";
                      return (
                        <TableRow key={edge.id}>
                          <TableCell className="font-medium">{fromDepot}</TableCell>
                          <TableCell className="font-medium">{toDepot}</TableCell>
                          <TableCell>{edge.distanceKm} km</TableCell>
                          <TableCell>₹{edge.tollCost}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deleteEdgeMutation.isPending}
                              onClick={() => {
                                if (confirm("Delete this route connection?")) {
                                  deleteEdgeMutation.mutate(edge.id);
                                }
                              }}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}
