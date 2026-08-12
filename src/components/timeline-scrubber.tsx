"use client";

import { useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getEntityEvents } from "@/server/actions/history";
import { HistoryIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { useTimelineScrubberStore } from "@/store/timeline-scrubber-store";

type TimelineScrubberProps = {
  entityType: "trip" | "vehicle" | "driver";
  entityId: string;
  entityName: string;
  currentStatus: string;
};

export function TimelineScrubber({ entityType: propEntityType, entityId: propEntityId, entityName: propEntityName, currentStatus: propCurrentStatus }: TimelineScrubberProps) {
  const {
    isOpen,
    entityType,
    entityId,
    entityName,
    events,
    loading,
    currentIndex,
    reconstructedState,
    replayLoading,
    openScrubber,
    closeScrubber,
    setEvents,
    setLoading,
    setCurrentIndex,
    setReconstructedState,
    setReplayLoading,
  } = useTimelineScrubberStore();

  const isThisActive = isOpen && entityId === propEntityId;

  useEffect(() => {
    if (isThisActive) {
      loadEvents();
    }
  }, [isThisActive]);

  async function loadEvents() {
    if (!entityType || !entityId) return;
    setLoading(true);
    try {
      const data = await getEntityEvents(entityType, entityId);
      setEvents(data);
      setCurrentIndex(data.length - 1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load event timeline");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isThisActive || events.length === 0 || currentIndex < 0 || currentIndex >= events.length) return;
    
    const selectedEvent = events[currentIndex];
    fetchReplayedState(selectedEvent.createdAt);
  }, [currentIndex, events, isThisActive]);

  async function fetchReplayedState(timestamp: string) {
    if (!entityType || !entityId) return;
    setReplayLoading(true);
    try {
      const res = await fetch(
        `/api/history/replay?entityType=${entityType}&entityId=${entityId}&timestamp=${encodeURIComponent(timestamp)}`
      );
      if (!res.ok) throw new Error("Failed to replay state");
      const data = await res.json();
      setReconstructedState(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to reconstruct state");
    } finally {
      setReplayLoading(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => openScrubber(propEntityType, propEntityId, propEntityName, propCurrentStatus)}>
        <HistoryIcon className="h-4 w-4 text-muted-foreground" />
      </Button>

      <Dialog open={isThisActive} onOpenChange={(open) => {
        if (!open) closeScrubber();
      }}>
        <DialogContent className="max-w-3xl bg-background border shadow-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-indigo-500" />
                Time-Travel Audit Timeline: {entityName}
              </DialogTitle>
              <DialogDescription>
                Scrub the timeline to reconstruct the historical state of this {entityType} at any event timestamp.
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs recorded for this {entityType}.
              </div>
            ) : (
              <div className="space-y-6 pt-4">
                {/* SLIDER / SCRUBBER CONTROL */}
                <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3">
                  <div className="flex justify-between text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    <span>Start of Records</span>
                    <span>Point-in-Time: {new Date(events[currentIndex]?.createdAt).toLocaleString()}</span>
                    <span>Current State</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={events.length - 1} 
                    value={currentIndex}
                    onChange={(e) => setCurrentIndex(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Step 1</span>
                    <span className="text-indigo-500">Event {currentIndex + 1} of {events.length}</span>
                    <span className="text-muted-foreground">Step {events.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[40vh] overflow-hidden">
                  {/* LEFT: TIMELINE LOG */}
                  <div className="border rounded-lg p-4 bg-muted/10 overflow-y-auto space-y-4 pr-2">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Event Log</h4>
                    <div className="space-y-4 relative border-l border-border pl-4">
                      {events.map((event, idx) => {
                        const isSelected = idx === currentIndex;
                        return (
                          <div key={event.id} className="relative group cursor-pointer" onClick={() => setCurrentIndex(idx)}>
                            {/* Dot indicator */}
                            <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 transition-transform duration-150 ease-out ${
                              isSelected ? 'bg-indigo-500 border-indigo-500 scale-125' : 'bg-background border-muted-foreground'
                            }`} />

                            <div className={`p-3 rounded-md border transition-[background-color,border-color,box-shadow] duration-150 ease-out ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/10 shadow-sm'
                                : 'border-border bg-background hover:bg-muted/30'
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-muted-foreground">
                                  {new Date(event.createdAt).toLocaleTimeString()}
                                </span>
                                <StatusBadge status={event.toStatus} />
                              </div>
                              {event.reason && (
                                <p className="text-sm text-foreground font-medium mt-1">{event.reason}</p>
                              )}
                              {event.fromStatus && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Transitioned from <span className="font-semibold">{event.fromStatus}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT: RECONSTRUCTED STATE PANEL */}
                  <div className="border rounded-lg p-4 bg-card flex flex-col justify-between relative overflow-hidden">
                    <div>
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Reconstructed State</h4>
                      <div className={`transition-all duration-200 ${replayLoading ? 'blur-[2px] opacity-70 pointer-events-none' : 'blur-none opacity-100'}`}>
                        {reconstructedState ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm font-medium text-muted-foreground">Status</span>
                              <StatusBadge status={reconstructedState.status} />
                            </div>

                            {entityType === "vehicle" && (
                              <div className="flex justify-between items-center pb-2 border-b">
                                <span className="text-sm font-medium text-muted-foreground">Odometer Reading</span>
                                <span className="text-sm font-bold text-foreground">
                                  {reconstructedState.odometer ? `${reconstructedState.odometer} km` : "0 km"}
                                </span>
                              </div>
                            )}

                            {entityType === "trip" && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center pb-2 border-b">
                                  <span className="text-sm font-medium text-muted-foreground">Start Odometer</span>
                                  <span className="text-sm font-bold text-foreground">
                                    {reconstructedState.startOdometer ? `${reconstructedState.startOdometer} km` : "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b">
                                  <span className="text-sm font-medium text-muted-foreground">Final Odometer</span>
                                  <span className="text-sm font-bold text-foreground">
                                    {reconstructedState.finalOdometer ? `${reconstructedState.finalOdometer} km` : "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b">
                                  <span className="text-sm font-medium text-muted-foreground">Fuel Consumed</span>
                                  <span className="text-sm font-bold text-foreground">
                                    {reconstructedState.fuelConsumed ? `${reconstructedState.fuelConsumed} L` : "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b">
                                  <span className="text-sm font-medium text-muted-foreground">Trip Revenue</span>
                                  <span className="text-sm font-bold text-emerald-500">
                                    {reconstructedState.revenue ? `$${reconstructedState.revenue}` : "N/A"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Adjust slider to load state.</p>
                        )}
                      </div>
                    </div>

                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    State reconstructed dynamically by replaying the first {currentIndex + 1} event logs.
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
