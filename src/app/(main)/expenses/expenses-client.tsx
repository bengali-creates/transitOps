"use client";

import { useState, useRef, useEffect } from "react";
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
import { createExpense } from "@/server/actions/expenses";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getExpenses } from "@/server/actions/expenses";
import { listVehicles } from "@/server/actions/vehicles";

export function ExpensesClient({ canWrite }: { canWrite: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: () => listVehicles({ pageParam: 0 }),
  });
  const vehicles = vehiclesData?.data || [];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["expenses-logs"],
    queryFn: async ({ pageParam = 0 }) => {
      return getExpenses({ pageParam });
    },
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

  const displayLogs = data?.pages.flatMap((page) => page.data) || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createExpense({
        vehicleId: formData.get("vehicleId") || undefined,
        type: formData.get("type"),
        amount: formData.get("amount"),
        description: formData.get("description") || undefined,
        incurredDate: formData.get("incurredDate"),
      });
      toast.success("Expense added successfully");
      setOpen(false);
    } catch (err) {
      toast.error("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Other Expenses</h1>
          <p className="text-muted-foreground mt-1">Track tolls, parking, and miscellaneous costs.</p>
        </div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.incurredDate).toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{log.type}</TableCell>
                  <TableCell>{log.vehicleName || "-"}</TableCell>
                  <TableCell>{log.description || "-"}</TableCell>
                  <TableCell className="text-right">${Number(log.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {displayLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No expenses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div ref={loadMoreRef} className="h-4 w-full flex items-center justify-center py-4">
            {isFetchingNextPage && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
