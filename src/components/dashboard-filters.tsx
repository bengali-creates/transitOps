"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  };

  const currentType = searchParams.get("type") || "all";
  const currentStatus = searchParams.get("status") || "all";
  const currentRegion = searchParams.get("region") || "all";

  return (
    <div className="space-y-3">

      <h3 className="text-xs  font-semibold tracking-widest text-muted-foreground uppercase">Filters</h3>
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={currentType} onValueChange={(val) => handleFilterChange("type", val)} >
          <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
            <SelectValue placeholder="Vehicle Type" />
          </SelectTrigger>
          <SelectContent className=" bg-background" position="popper" sideOffset={4}>
            <SelectItem value="all">Vehicle Type: All</SelectItem>
            <SelectItem value="van">Van</SelectItem>
            <SelectItem value="truck">Truck</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentStatus} onValueChange={(val) => handleFilterChange("status", val)}>
          <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent position="popper" className=" bg-background" sideOffset={4}>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="on_trip">On Trip</SelectItem>
            <SelectItem value="in_shop">In Shop</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentRegion} onValueChange={(val) => handleFilterChange("region", val)}>
          <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent position="popper" className=" bg-background" sideOffset={4}>
            <SelectItem value="all">Region: All</SelectItem>
            <SelectItem value="north">North</SelectItem>
            <SelectItem value="south">South</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
