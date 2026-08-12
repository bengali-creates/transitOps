import { create } from "zustand";

interface TimelineScrubberState {
  isOpen: boolean;
  entityType: "trip" | "vehicle" | "driver" | null;
  entityId: string | null;
  entityName: string | null;
  currentStatus: string | null;
  events: any[];
  loading: boolean;
  currentIndex: number;
  reconstructedState: any;
  replayLoading: boolean;

  openScrubber: (entityType: "trip" | "vehicle" | "driver", entityId: string, entityName: string, currentStatus: string) => void;
  closeScrubber: () => void;
  setEvents: (events: any[]) => void;
  setLoading: (loading: boolean) => void;
  setCurrentIndex: (index: number) => void;
  setReconstructedState: (state: any) => void;
  setReplayLoading: (replayLoading: boolean) => void;
}

export const useTimelineScrubberStore = create<TimelineScrubberState>((set) => ({
  isOpen: false,
  entityType: null,
  entityId: null,
  entityName: null,
  currentStatus: null,
  events: [],
  loading: false,
  currentIndex: 0,
  reconstructedState: null,
  replayLoading: false,

  openScrubber: (entityType, entityId, entityName, currentStatus) =>
    set({
      isOpen: true,
      entityType,
      entityId,
      entityName,
      currentStatus,
      events: [],
      currentIndex: 0,
      reconstructedState: null,
    }),
  closeScrubber: () =>
    set({
      isOpen: false,
      entityType: null,
      entityId: null,
      entityName: null,
      currentStatus: null,
      events: [],
      currentIndex: 0,
      reconstructedState: null,
    }),
  setEvents: (events) => set({ events }),
  setLoading: (loading) => set({ loading }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setReconstructedState: (reconstructedState) => set({ reconstructedState }),
  setReplayLoading: (replayLoading) => set({ replayLoading }),
}));
