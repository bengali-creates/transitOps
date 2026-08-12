import { create } from "zustand";

interface TripFormState {
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: string;
  plannedDistance: string;
  isSubmitting: boolean;
  isSuggesting: boolean;
  suggestionReason: string;

  setSource: (source: string) => void;
  setDestination: (destination: string) => void;
  setVehicleId: (vehicleId: string) => void;
  setDriverId: (driverId: string) => void;
  setCargoWeight: (cargoWeight: string) => void;
  setPlannedDistance: (plannedDistance: string) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setSuggesting: (isSuggesting: boolean) => void;
  setSuggestionReason: (reason: string) => void;
  resetForm: () => void;
}

export const useTripFormStore = create<TripFormState>((set) => ({
  source: "",
  destination: "",
  vehicleId: "",
  driverId: "",
  cargoWeight: "",
  plannedDistance: "",
  isSubmitting: false,
  isSuggesting: false,
  suggestionReason: "",

  setSource: (source) => set({ source }),
  setDestination: (destination) => set({ destination }),
  setVehicleId: (vehicleId) => set({ vehicleId }),
  setDriverId: (driverId) => set({ driverId }),
  setCargoWeight: (cargoWeight) => set({ cargoWeight }),
  setPlannedDistance: (plannedDistance) => set({ plannedDistance }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setSuggesting: (isSuggesting) => set({ isSuggesting }),
  setSuggestionReason: (suggestionReason) => set({ suggestionReason }),
  resetForm: () =>
    set({
      source: "",
      destination: "",
      vehicleId: "",
      driverId: "",
      cargoWeight: "",
      plannedDistance: "",
      isSubmitting: false,
      isSuggesting: false,
      suggestionReason: "",
    }),
}));
