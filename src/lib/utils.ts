import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a numeric string or number as a currency amount. */
export function formatCurrency(value: string | number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/** Fuel efficiency in distance per liter, guarded against divide by zero. */
export function fuelEfficiency(distance: number, fuel: number): number {
  if (fuel <= 0) return 0;
  return Number((distance / fuel).toFixed(2));
}

/** Vehicle ROI per the brief: (revenue - (maintenance + fuel)) / acquisitionCost. */
export function vehicleRoi(
  revenue: number,
  maintenance: number,
  fuel: number,
  acquisitionCost: number,
): number {
  if (acquisitionCost <= 0) return 0;
  return Number(
    ((revenue - (maintenance + fuel)) / acquisitionCost).toFixed(4),
  );
}
