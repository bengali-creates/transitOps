"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFuelLog } from "@/server/actions/fuel";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FuelClient({ initialLogs, vehicles, canWrite }: { initialLogs: any[], vehicles: any[], canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createFuelLog({
        vehicleId: formData.get("vehicleId"),
        liters: formData.get("liters"),
        cost: formData.get("cost"),
        odometer: formData.get("odometer") || undefined,
        loggedDate: formData.get("loggedDate"),
      });
      toast.success("Fuel log added successfully");
      setOpen(false);
    } catch (err) {
      toast.error("Failed to add fuel log");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fuel Logs</h1>
          <p className="text-muted-foreground mt-1">Track fuel consumption and costs across the fleet.</p>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Log Fuel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Fuel Log</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleId">Vehicle</Label>
                  <Select name="vehicleId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registrationNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="liters">Liters</Label>
                  <Input id="liters" name="liters" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input id="cost" name="cost" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odometer">Odometer (Optional)</Label>
                  <Input id="odometer" name="odometer" type="number" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loggedDate">Date</Label>
                  <Input id="loggedDate" name="loggedDate" type="date" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Adding..." : "Add Log"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Liters</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.loggedDate).toLocaleDateString()}</TableCell>
                  <TableCell>{log.vehicleName}</TableCell>
                  <TableCell>{log.liters} L</TableCell>
                  <TableCell className="text-right">${Number(log.cost).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {initialLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No fuel logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
