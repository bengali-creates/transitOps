"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { PlusIcon, PencilIcon, BanIcon } from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { createVehicle, updateVehicle, retireVehicle, listVehicles } from "@/server/actions/vehicles";
import { toast } from "sonner";
import { useInfiniteQuery } from "@tanstack/react-query";

export function VehicleClient({ canWrite }: { canWrite: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["vehicles-infinite"],
    queryFn: async ({ pageParam = 0 }) => listVehicles({ pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: any) => lastPage.nextPage,
  });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { root: null, rootMargin: "20px", threshold: 1.0 });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const vehicles = data?.pages.flatMap((page) => page.data) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>;
      case "on_trip":
        return <Badge className="bg-blue-500 hover:bg-blue-600">On Trip</Badge>;
      case "in_shop":
        return <Badge className="bg-orange-500 hover:bg-orange-600">In Shop</Badge>;
      case "retired":
        return <Badge className="bg-red-500 hover:bg-red-600">Retired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        let res;
        if (editingVehicle) {
          res = await updateVehicle(editingVehicle.id, formData);
        } else {
          res = await createVehicle(formData);
        }

        if (res?.error) {
          toast.error(res.error);
          return;
        }

        toast.success(`Vehicle ${editingVehicle ? "updated" : "created"} successfully`);
        setIsOpen(false);
        setEditingVehicle(null);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      }
    });
  }

  function handleRetire(id: string) {
    toast("Are you sure you want to retire this vehicle? This action cannot be reversed.", {
      action: {
        label: "Confirm",
        onClick: () => {
          startTransition(async () => {
            try {
              await retireVehicle(id);
              toast.success("Vehicle retired");
              window.location.reload();
            } catch (err: any) {
              toast.error(err.message || "Failed to retire vehicle");
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

  function handleEdit(v: any) {
    setEditingVehicle(v);
    setIsOpen(true);
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vehicle Registry</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your fleet of vehicles here.</p>
        </div>
        {canWrite && (
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingVehicle(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" /> Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
              </DialogHeader>
              <form action={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration No.</Label>
                    <Input 
                      id="registrationNumber" 
                      name="registrationNumber" 
                      defaultValue={editingVehicle?.registrationNumber} 
                      required 
                      disabled={!!editingVehicle}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name / Model</Label>
                    <Input id="name" name="name" defaultValue={editingVehicle?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" defaultValue={editingVehicle?.type || "Truck"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background" position="popper" sideOffset={4}>
                        <SelectItem value="Truck">Truck</SelectItem>
                        <SelectItem value="Mini Truck">Mini Truck</SelectItem>
                        <SelectItem value="Van">Van</SelectItem>
                        <SelectItem value="Ship">Ship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoadCapacity">Capacity</Label>
                    <Input id="maxLoadCapacity" name="maxLoadCapacity" type="number" step="0.01" defaultValue={editingVehicle?.maxLoadCapacity} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odometer">Odometer (km)</Label>
                    <Input id="odometer" name="odometer" type="number" step="0.01" defaultValue={editingVehicle?.odometer || 0} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acquisitionCost">Acq. Cost</Label>
                    <Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" defaultValue={editingVehicle?.acquisitionCost || 0} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingVehicle?.status || "available"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent className="bg-background" position="popper" sideOffset={4}>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="on_trip">On Trip</SelectItem>
                        <SelectItem value="in_shop">In Shop</SelectItem>
                        {editingVehicle?.status === "retired" && (
                          <SelectItem value="retired" disabled>Retired</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border bg-card w-full overflow-x-auto overflow-y-auto h-[60vh]">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>REG. NO.</TableHead>
              <TableHead>NAME/MODE</TableHead>
              <TableHead>TYPE</TableHead>
              <TableHead>CAPACITY</TableHead>
              <TableHead>ODOMETER</TableHead>
              <TableHead>STATUS</TableHead>
              {canWrite && <TableHead className="text-right">ACTIONS</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.registrationNumber}</TableCell>
                <TableCell>{v.name}</TableCell>
                <TableCell>{v.type}</TableCell>
                <TableCell>{v.maxLoadCapacity}</TableCell>
                <TableCell>{v.odometer}</TableCell>
                <TableCell>{getStatusBadge(v.status)}</TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {v.status !== "retired" ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(v)}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRetire(v.id)}>
                            <BanIcon className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground mr-2">Terminal</span>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {vehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="text-center h-24 text-muted-foreground">
                  No vehicles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div ref={loadMoreRef} className="h-4 w-full flex items-center justify-center py-4">
          {isFetchingNextPage && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
        </div>
      </div>
    </div>
  );
}
