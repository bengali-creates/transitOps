"use client";

import { useState, useTransition } from "react";
import { PlusIcon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
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
import { createDriver, updateDriver, updateDriverStatus } from "@/server/actions/drivers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DriverClient({ initialDrivers, canWrite }: { initialDrivers: any[], canWrite: boolean }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [isOpen, setIsOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-500 hover:bg-green-600">Available</Badge>;
      case "on_trip":
        return <Badge className="bg-blue-500 hover:bg-blue-600">On Trip</Badge>;
      case "off_duty":
        return <Badge className="bg-gray-500 hover:bg-gray-600">Off Duty</Badge>;
      case "suspended":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getExpiryStatus = (dateString: string) => {
    const expiry = new Date(dateString);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "expired";
    } else if (diffDays <= 30) {
      return "expiring_soon";
    }
    return "valid";
  };

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        let res;
        if (editingDriver) {
          res = await updateDriver(editingDriver.id, formData);
        } else {
          res = await createDriver(formData);
        }

        if (res?.error) {
          toast.error(res.error);
          return;
        }

        toast.success(`Driver ${editingDriver ? "updated" : "created"} successfully`);
        setIsOpen(false);
        setEditingDriver(null);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "An error occurred");
      }
    });
  }

  async function handleStatusChange(id: string, status: "available" | "on_trip" | "off_duty" | "suspended") {
    startTransition(async () => {
      try {
        await updateDriverStatus(id, status);
        toast.success("Driver status updated");
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Failed to update driver status");
      }
    });
  }

  function handleEdit(d: any) {
    setEditingDriver(d);
    setIsOpen(true);
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Drivers</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage drivers and compliance here.</p>
        </div>
        {canWrite && (
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingDriver(null);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" /> Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingDriver ? "Edit Driver" : "Add Driver"}</DialogTitle>
              </DialogHeader>
              <form action={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" defaultValue={editingDriver?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License No.</Label>
                    <Input 
                      id="licenseNumber" 
                      name="licenseNumber" 
                      defaultValue={editingDriver?.licenseNumber} 
                      required 
                      disabled={!!editingDriver}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseCategory">License Category</Label>
                    <Input id="licenseCategory" name="licenseCategory" defaultValue={editingDriver?.licenseCategory} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseExpiryDate">License Expiry Date</Label>
                    <Input id="licenseExpiryDate" name="licenseExpiryDate" type="date" defaultValue={editingDriver?.licenseExpiryDate} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact</Label>
                    <Input id="contactNumber" name="contactNumber" defaultValue={editingDriver?.contactNumber} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="safetyScore">Safety Score</Label>
                    <Input id="safetyScore" name="safetyScore" type="number" min="0" max="100" defaultValue={editingDriver?.safetyScore || 100} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={editingDriver?.status || "available"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="on_trip">On Trip</SelectItem>
                        <SelectItem value="off_duty">Off Duty</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
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

      <div className="rounded-md border bg-card w-full overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>NAME</TableHead>
              <TableHead>LICENSE NO.</TableHead>
              <TableHead>CATEGORY</TableHead>
              <TableHead>EXPIRY</TableHead>
              <TableHead>CONTACT</TableHead>
              <TableHead>SAFETY SCORE</TableHead>
              <TableHead>STATUS</TableHead>
              {canWrite && <TableHead className="text-right">ACTIONS</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((d) => {
              const expiryStatus = getExpiryStatus(d.licenseExpiryDate);
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.licenseNumber}</TableCell>
                  <TableCell>{d.licenseCategory}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "flex items-center gap-2",
                      expiryStatus === "expired" ? "text-red-500 font-bold" : 
                      expiryStatus === "expiring_soon" ? "text-orange-500 font-semibold" : ""
                    )}>
                      {d.licenseExpiryDate}
                      {expiryStatus === "expired" && <span className="text-xs uppercase bg-red-100 text-red-800 px-1 py-0.5 rounded">Expired</span>}
                      {expiryStatus === "expiring_soon" && <span className="text-xs uppercase bg-orange-100 text-orange-800 px-1 py-0.5 rounded">&lt; 30d</span>}
                    </span>
                  </TableCell>
                  <TableCell>{d.contactNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", d.safetyScore > 80 ? "bg-green-500" : d.safetyScore > 60 ? "bg-orange-500" : "bg-red-500")}
                          style={{ width: `${Math.min(100, Math.max(0, d.safetyScore))}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{d.safetyScore}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(d.status)}</TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        {d.status === "suspended" ? (
                          <Button variant="ghost" size="icon" title="Reinstate" onClick={() => handleStatusChange(d.id, "available")}>
                            <CheckIcon className="h-4 w-4 text-green-500" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" title="Suspend" onClick={() => handleStatusChange(d.id, "suspended")}>
                            <XIcon className="h-4 w-4 text-orange-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {drivers.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 8 : 7} className="text-center h-24 text-muted-foreground">
                  No drivers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
