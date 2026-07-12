"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Navigation, Truck, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createTrip, dispatchTripAction, completeTripAction, cancelTripAction } from "@/server/actions/trips";

type Trip = any; // Will use inferred types from page.tsx in practice, but keeping simple here.
type Vehicle = any;
type Driver = any;

interface TripClientProps {
  initialTrips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
}

export function TripClient({ initialTrips, vehicles, drivers }: TripClientProps) {
  const [trips, setTrips] = useState(initialTrips);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [plannedDistance, setPlannedDistance] = useState("");

  const availableVehicles = vehicles.filter(v => v.status === "available");
  const availableDrivers = drivers.filter(d => d.status === "available");

  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const weight = Number(cargoWeight);
  const capacity = selectedVehicle ? Number(selectedVehicle.maxLoadCapacity) : 0;
  
  const isOverCapacity = selectedVehicle && weight > capacity;
  const overage = weight - capacity;

  const canDispatch = source && destination && vehicleId && driverId && cargoWeight && plannedDistance && !isOverCapacity;

  async function handleCreateAndDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!canDispatch || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("source", source);
      formData.append("destination", destination);
      formData.append("vehicleId", vehicleId);
      formData.append("driverId", driverId);
      formData.append("cargoWeight", cargoWeight);
      formData.append("plannedDistance", plannedDistance);

      const newTrip = await createTrip(formData);
      
      if (newTrip && newTrip.id) {
        await dispatchTripAction(newTrip.id);
        toast.success("Trip created and dispatched successfully!");
        // reset form
        setSource("");
        setDestination("");
        setVehicleId("");
        setDriverId("");
        setCargoWeight("");
        setPlannedDistance("");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to dispatch trip");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  function handleCancelForm() {
    setSource("");
    setDestination("");
    setVehicleId("");
    setDriverId("");
    setCargoWeight("");
    setPlannedDistance("");
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* LEFT COLUMN: CREATE TRIP & LIFECYCLE */}
      <div className="w-full lg:w-[450px] shrink-0 space-y-6">
        
        {/* LIFECYCLE */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Trip Lifecycle</h3>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-4 right-4 top-[7px] h-[3px] bg-muted/50"></div>
            {['Draft', 'Dispatched', 'Completed', 'Cancelled'].map((step) => {
              const isDraft = step === 'Draft';
              const isDispatched = step === 'Dispatched';
              const bgClass = isDraft ? 'bg-green-600' : isDispatched ? 'bg-blue-500' : 'bg-muted-foreground';
              const textClass = isDraft ? 'text-green-600' : isDispatched ? 'text-blue-500' : 'text-muted-foreground';
              
              return (
                <div key={step} className="flex flex-col items-center gap-2 bg-background px-2 z-10">
                  <div className={`w-4 h-4 rounded-full ${bgClass}`}></div>
                  <span className={`text-xs font-medium ${textClass}`}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CREATE TRIP FORM */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Create Trip</h3>
          <form onSubmit={handleCreateAndDispatch} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Source</Label>
              <Input placeholder="e.g. Gandhinagar Depot" value={source} onChange={e => setSource(e.target.value)} required className="w-full bg-background" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Destination</Label>
              <Input placeholder="e.g. Ahmedabad Hub" value={destination} onChange={e => setDestination(e.target.value)} required className="w-full bg-background" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Vehicle (Available Only)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId} required>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-background border shadow-md max-h-60">
                  {availableVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} - {v.maxLoadCapacity} kg capacity
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Driver (Available Only)</Label>
              <Select value={driverId} onValueChange={setDriverId} required>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent position="popper" className="bg-background border shadow-md max-h-60">
                  {availableDrivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.licenseCategory})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Cargo Weight (kg)</Label>
              <Input type="number" placeholder="700" value={cargoWeight} onChange={e => setCargoWeight(e.target.value)} required className="w-full bg-background" min="1" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Planned Distance (km)</Label>
              <Input type="number" placeholder="38" value={plannedDistance} onChange={e => setPlannedDistance(e.target.value)} required className="w-full bg-background" min="1" />
            </div>

            {/* Error Message Box */}
            {isOverCapacity && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="font-medium">Vehicle Capacity: {capacity} kg</div>
                <div>Cargo Weight: {weight} kg</div>
                <div className="font-bold flex items-center gap-1 mt-1">
                  <span className="text-lg leading-none">×</span> Capacity exceeded by {overage} kg — dispatch blocked
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <Button 
                type="submit" 
                disabled={!canDispatch || isSubmitting} 
                className="flex-1"
                variant={canDispatch ? "default" : "secondary"}
              >
                {isSubmitting ? "Dispatching..." : (canDispatch ? "Dispatch" : "Dispatch (disabled)")}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={handleCancelForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: LIVE BOARD */}
      <div className="flex-1 space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Live Board</h3>
        
        <div className="grid gap-4">
          {initialTrips.map(trip => (
            <Card key={trip.id} className="bg-card/50 hover:bg-card transition-colors border-dashed">
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">TRIP-{trip.id.substring(0,6).toUpperCase()}</span>
                    <span className="text-sm text-muted-foreground uppercase tracking-wider">{trip.vehicle?.name} / {trip.driver?.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 font-medium">
                    <span>{trip.source}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span>{trip.destination}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant={trip.status === "dispatched" ? "default" : trip.status === "cancelled" ? "destructive" : "secondary"}>
                      {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                    </Badge>
                    
                    <span className="text-xs text-muted-foreground">
                      {trip.status === 'draft' ? 'Awaiting driver' : trip.status === 'cancelled' ? 'Vehicle went to shop' : '45 min'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {initialTrips.length === 0 && (
            <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
              No trips found. Create one to get started.
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground pt-8">
          On Complete: odometer → fuel log → expenses → Vehicle & Driver Available
        </div>
      </div>
    </div>
  );
}
