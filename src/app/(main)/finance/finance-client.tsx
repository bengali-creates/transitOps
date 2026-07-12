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
import { createExpense } from "@/server/actions/expenses";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function FinanceClient({ 
  initialFuelLogs, 
  initialExpenses, 
  vehicles, 
  trips,
  totalOperationalCost, 
  canWrite 
}: { 
  initialFuelLogs: any[], 
  initialExpenses: any[], 
  vehicles: any[], 
  trips: any[],
  totalOperationalCost: number, 
  canWrite: boolean 
}) {
  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFuelSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      setFuelOpen(false);
    } catch (err) {
      toast.error("Failed to add fuel log");
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createExpense({
        vehicleId: formData.get("vehicleId") || undefined,
        tripId: formData.get("tripId") || undefined,
        type: formData.get("type"),
        amount: formData.get("amount"),
        description: formData.get("description") || undefined,
        incurredDate: formData.get("incurredDate"),
      });
      toast.success("Expense added successfully");
      setExpenseOpen(false);
    } catch (err) {
      toast.error("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Fuel Logs
          </h2>
          {canWrite && (
            <div className="flex gap-2">
              <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6">
                    + Log Fuel
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Fuel Log</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleFuelSubmit} className="space-y-4">
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

              <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-700 hover:bg-amber-800 text-white rounded-full px-6">
                    + Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select name="type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="toll">Toll</SelectItem>
                          <SelectItem value="parking">Parking</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tripId">Trip (Optional)</Label>
                      <Select name="tripId">
                        <SelectTrigger>
                          <SelectValue placeholder="Select trip" />
                        </SelectTrigger>
                        <SelectContent>
                          {trips.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.id.substring(0, 8).toUpperCase()} ({t.source} - {t.destination})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleId">Vehicle (Optional)</Label>
                      <Select name="vehicleId">
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
                      <Label htmlFor="amount">Amount</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input id="description" name="description" type="text" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incurredDate">Date</Label>
                      <Input id="incurredDate" name="incurredDate" type="date" required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Adding..." : "Add Expense"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b-secondary">
              <TableHead className="text-xs">VEHICLE</TableHead>
              <TableHead className="text-xs">DATE</TableHead>
              <TableHead className="text-xs">LITERS</TableHead>
              <TableHead className="text-xs text-right">FUEL COST</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialFuelLogs.map((log) => (
              <TableRow key={log.id} className="border-none">
                <TableCell className="py-4">{log.vehicleName}</TableCell>
                <TableCell className="py-4">{new Date(log.loggedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                <TableCell className="py-4">{log.liters} L</TableCell>
                <TableCell className="py-4 text-right">{Number(log.cost).toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {initialFuelLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No fuel logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase border-b pb-2">
          Other Expenses (Toll / Misc)
        </h2>
        <Table>
          <TableHeader>
            <TableRow className="border-b-secondary">
              <TableHead className="text-xs">TRIP</TableHead>
              <TableHead className="text-xs">VEHICLE</TableHead>
              <TableHead className="text-xs">TOLL</TableHead>
              <TableHead className="text-xs">OTHER</TableHead>
              <TableHead className="text-xs">MAINT. (LINKED)</TableHead>
              <TableHead className="text-xs text-right">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialExpenses.map((log) => (
              <TableRow key={log.id} className="border-none">
                <TableCell className="py-4">{log.tripNumber?.substring(0, 8).toUpperCase() || "-"}</TableCell>
                <TableCell className="py-4">{log.vehicleName || "-"}</TableCell>
                <TableCell className="py-4">{log.type === "toll" ? Number(log.amount).toLocaleString() : "0"}</TableCell>
                <TableCell className="py-4">{["other", "parking"].includes(log.type) ? Number(log.amount).toLocaleString() : "0"}</TableCell>
                <TableCell className="py-4">{log.type === "maintenance" ? Number(log.amount).toLocaleString() : "0"}</TableCell>
                <TableCell className="py-4 text-right">
                  <Badge variant="outline" className={log.type === "maintenance" ? "bg-green-500/20 text-green-500 border-none" : "bg-muted text-muted-foreground border-none"}>
                    {Number(log.amount).toLocaleString()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {initialExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-b py-4 mt-6">
          <span className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Total Operational Cost (Auto) = Fuel + Maint
          </span>
          <span className="text-lg font-bold text-amber-500">
            {totalOperationalCost.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
