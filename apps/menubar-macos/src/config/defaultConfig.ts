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
