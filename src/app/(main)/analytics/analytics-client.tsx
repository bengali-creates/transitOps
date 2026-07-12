"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AnalyticsData {
  fuelEfficiency: number;
  fleetUtilization: number;
  operationalCost: number;
  vehicleROI: number;
  costliestVehicles: { name: string; cost: number }[];
  monthlyRevenue: { name: string; value: number }[];
  vehicleMetrics: { vehicle: string; cost: number; roi: number; efficiency: number }[];
}

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleExportCSV = () => {
    try {
      const csvData = data.vehicleMetrics.map(v => ({
        Vehicle: v.vehicle,
        "Total Cost": v.cost.toFixed(2),
        "ROI (%)": v.roi.toFixed(2),
        "Efficiency (km/l)": v.efficiency.toFixed(2),
      }));
      
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transitops-analytics-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error("Failed to export CSV");
    }
  };

  if (!isMounted) return null;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full animate-in fade-in zoom-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground mt-1">ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Fuel Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-semibold">
              {data.fuelEfficiency.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km/l</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Fleet Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-semibold">
              {data.fleetUtilization.toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Operational Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-semibold">
              {data.operationalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">
              Vehicle ROI
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-semibold">
              {data.vehicleROI.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} 
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
                <Bar 
                  dataKey="value" 
                  fill="var(--color-primary)" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Costliest Vehicles Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Top Costliest Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.costliestVehicles} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 12, fontWeight: 500 }}
                  width={80}
                />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
                <Bar 
                  dataKey="cost" 
                  radius={[0, 4, 4, 0]} 
                  barSize={24}
                  animationDuration={1500}
                >
                  {data.costliestVehicles.map((entry, index) => {
                    const colors = ["#ef4444", "#f97316", "#f59e0b", "#3b82f6", "#8b5cf6"];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Vehicle Reports Table */}
      <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Vehicle Detailed Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-card overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-medium">VEHICLE</TableHead>
                    <TableHead className="text-xs font-medium text-right">TOTAL COST</TableHead>
                    <TableHead className="text-xs font-medium text-right">ROI (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.vehicleMetrics.map((v) => (
                    <TableRow key={v.vehicle}>
                      <TableCell className="font-medium">{v.vehicle}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{v.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{v.roi.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {data.vehicleMetrics.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No vehicle metrics found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
