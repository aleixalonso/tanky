import type { FuelType } from "@tanky/types";

export type FuelLookupConfig = {
  country: string;
  location: {
    lat: number;
    lon: number;
  };
  fuelType: FuelType;
  radiusKm: number;
};

export const DEFAULT_CONFIG: FuelLookupConfig = {
  country: "ES",
  location: {
    lat: 41.39,
    lon: 2.17,
  },
  fuelType: "gasoline95",
  radiusKm: 5,
};

export const SETTINGS_STORAGE_KEY = "tanky:menubar:config";

export const FUEL_OPTIONS: FuelType[] = [
  "gasoline95",
  "gasoline98",
  "diesel",
  "dieselPremium",
  "lpg",
  "cng",
  "lng",
];

export const FUEL_LABELS: Record<FuelType, string> = {
  gasoline95: "Gasoline 95",
  gasoline98: "Gasoline 98",
  diesel: "Diesel",
  dieselPremium: "Diesel Premium",
  lpg: "LPG",
  cng: "CNG",
  lng: "LNG",
  electric: "Electric",
};

export function parseStoredConfig(raw: string): FuelLookupConfig | null {
  try {
    const value = JSON.parse(raw) as Partial<FuelLookupConfig>;
    const lat = value.location?.lat;
    const lon = value.location?.lon;
    const radiusKm = value.radiusKm;
    const fuelType = value.fuelType;
    const country = value.country;

    if (
      country !== "ES" ||
      typeof lat !== "number" ||
      typeof lon !== "number" ||
      typeof radiusKm !== "number" ||
      !FUEL_OPTIONS.includes(fuelType as FuelType)
    ) {
      return null;
    }

    return {
      country,
      location: { lat, lon },
      fuelType: fuelType as FuelType,
      radiusKm,
    };
  } catch {
    return null;
  }
}
