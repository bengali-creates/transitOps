"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createMaintenance, finishMaintenance } from "@/server/actions/maintenance";
import { toast } from "sonner";
import { CheckCircle2Icon } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { listMaintenanceLogs } from "@/server/actions/maintenance";
import { listVehicles } from "@/server/actions/vehicles";

export function MaintenanceClient({
  canWrite,
}: {
  canWrite: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  // Fetch vehicles for the dropdown
  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: () => listVehicles({ pageParam: 0 }),
  });

  const allVehicles = vehiclesData?.data || [];
  const eligibleVehicles = allVehicles.filter(
    (v) => v.status !== "on_trip" && v.status !== "retired"
  );

  const {data,fetchNextPage,hasNextPage,isFetchingNextPage,status}=useInfiniteQuery({
    queryKey:["maintenance-logs"],
    queryFn: async ({pageParam=0})=>{
      return listMaintenanceLogs({pageParam})
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any) => lastPage.nextPage,
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, {
      root: null,
      rootMargin: "20px",
      threshold: 1.0,
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  // Flatten the pages into a single array of logs
  const displayLogs = data?.pages.flatMap((page) => page.data) || [];
    
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">In Shop</Badge>;
      case "closed":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  async function onSubmit(formData: FormData) {
    if (!canWrite) return;
    
    startTransition(async () => {
      try {
        const res = await createMaintenance(formData);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Maintenance record opened successfully");
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      }
    });
  }

  function handleClose(id: string) {
    if (!canWrite) return;
    
    toast("Are you sure you want to mark this maintenance as completed?", {
      action: {
        label: "Confirm",
        onClick: () => {
          startTransition(async () => {
            try {
              const res = await finishMaintenance(id);
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Maintenance closed successfully");
              window.location.reload();
            } catch (err: any) {
              toast.error(err.message || "Failed to close maintenance");
            }
          });
        }
      },
      cancel: {
        label: "Cancel",
        onClick: () => {}
      }
    });
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      {/* <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Maintenance</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Log and track vehicle maintenance and repairs.
        </p>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">LOG SERVICE RECORD</CardTitle>
              <CardDescription>Open a new maintenance request</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={onSubmit} className="space-y-2">
                <div className="space-y-1 w-full">
                  <Label htmlFor="vehicleId">Vehicle</Label>
                  <Select name="vehicleId" required disabled={!canWrite || isPending}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent className="bg-background" position="popper" sideOffset={4}>
                      {eligibleVehicles.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No available vehicles
                        </SelectItem>
                      ) : (
                        eligibleVehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.registrationNumber} ({v.name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-full">
                  <Label htmlFor="type">Service Type</Label>
                  <Select name="type" required disabled={!canWrite || isPending}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background" position="popper" sideOffset={4}>
                      <SelectItem value="Oil Change">Oil Change</SelectItem>
                      <SelectItem value="Engine Repair">Engine Repair</SelectItem>
                      <SelectItem value="Tyre Replace">Tyre Replace</SelectItem>
                      <SelectItem value="Brake Service">Brake Service</SelectItem>
                      <SelectItem value="General Inspection">General Inspection</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-full">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    name="description" 
                    placeholder="Brief details..." 
                    disabled={!canWrite || isPending}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1 w-full">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                    disabled={!canWrite || isPending}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-1 w-full">
                  <Label htmlFor="odometer">Odometer (Optional)</Label>
                  <Input
                    id="odometer"
                    name="odometer"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Current reading"
                    disabled={!canWrite || isPending}
                    className="w-full"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={!canWrite || isPending} className="w-full">
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
                
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-medium w-16">Available</span>
                    <span>→ creating active record →</span>
                    <span className="text-orange-500 font-medium">In Shop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 font-medium w-16">In Shop</span>
                    <span>→ closing record →</span>
                    <span className="text-green-500 font-medium">Available</span>
                  </div>
                  <p className="pt-2 text-primary/80 italic">Note: In Shop vehicles are removed from the dispatch pool.</p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Table */}
        <div className="lg:col-span-8">
          <Card className="w-full h-full ">
            <CardHeader>
              <CardTitle className="text-lg">SERVICE LOG</CardTitle>
              <CardDescription>History of all vehicle maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-card w-full overflow-x-auto  overflow-y-auto h-[62vh]">
                <Table className="min-w-[600px] w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>VEHICLE</TableHead>
                      <TableHead>SERVICE</TableHead>
                      <TableHead>COST</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>STATUS</TableHead>
                      {canWrite && <TableHead className="text-right">ACTIONS</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {log.vehicle?.registrationNumber || "Unknown"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{log.type}</TableCell>
                        <TableCell className="whitespace-nowrap">{log.cost}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {log.openedAt ? format(new Date(log.openedAt), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getStatusBadge(log.status)}</TableCell>
                        {canWrite && (
                          <TableCell className="text-right whitespace-nowrap">
                            {log.status === "open" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClose(log.id)}
                                disabled={isPending}
                                className="h-8"
                              >
                                <CheckCircle2Icon className="h-4 w-4 mr-1 text-green-500" />
                                Mark Done
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {displayLogs.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={canWrite ? 6 : 5}
                          className="text-center h-32 text-muted-foreground"
                        >
                          No maintenance records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                {/* Intersection observer target for infinite scroll */}
                <div ref={loadMoreRef} className="h-4 w-full flex items-center justify-center py-4">
                  {isFetchingNextPage && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
