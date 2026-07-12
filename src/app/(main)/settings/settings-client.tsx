"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettings } from "@/server/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check } from "lucide-react";

const RBAC_DATA = [
  { role: "Fleet Manager", fleet: "✓", drivers: "✓", trips: "-", fuelExp: "-", analytics: "✓" },
  { role: "Dispatcher", fleet: "View", drivers: "-", trips: "✓", fuelExp: "-", analytics: "-" },
  { role: "Safety Officer", fleet: "-", drivers: "✓", trips: "View", fuelExp: "-", analytics: "-" },
  { role: "Financial Analyst", fleet: "View", drivers: "-", trips: "-", fuelExp: "✓", analytics: "✓" },
  { role: "Admin", fleet: "✓", drivers: "✓", trips: "✓", fuelExp: "✓", analytics: "✓" },
];

export function SettingsClient({ initialSettings, userRole }: { initialSettings: any, userRole: string }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Settings & RBAC</h2>
      </div>

      <div className="grid gap-12 md:grid-cols-2">
        {/* General Settings */}
        <div>
          <h3 className="text-lg font-medium mb-4 uppercase text-muted-foreground tracking-wider text-sm">General</h3>
          <form action={onSubmit} className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="depotName" className="uppercase text-xs text-muted-foreground">Depot Name</Label>
              <Input
                id="depotName"
                name="depotName"
                defaultValue={initialSettings?.depotName || ""}
                disabled={!isAdmin}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency" className="uppercase text-xs text-muted-foreground">Currency</Label>
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
              <Button type="submit" disabled={loading} className="w-40 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                {loading ? "Saving..." : "Save changes"}
              </Button>
            )}
          </form>
        </div>

        {/* RBAC Matrix */}
        <div>
          <h3 className="text-lg font-medium mb-4 uppercase text-muted-foreground tracking-wider text-sm">Role-Based Access (RBAC)</h3>
          <div className="rounded-md border border-border/50 overflow-hidden bg-background/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-border/50">
                  <TableHead className="uppercase text-xs font-medium w-[150px]">Role</TableHead>
                  <TableHead className="uppercase text-xs font-medium">Fleet</TableHead>
                  <TableHead className="uppercase text-xs font-medium">Drivers</TableHead>
                  <TableHead className="uppercase text-xs font-medium">Trips</TableHead>
                  <TableHead className="uppercase text-xs font-medium">Fuel/Exp</TableHead>
                  <TableHead className="uppercase text-xs font-medium">Analytics</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RBAC_DATA.map((row) => (
                  <TableRow key={row.role} className="border-b-border/50">
                    <TableCell className="font-medium text-sm">{row.role}</TableCell>
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
      </div>
    </div>
  );
}
