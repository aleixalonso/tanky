export type FuelType =
  | "gasoline95"
  | "gasoline98"
  | "diesel"
  | "dieselPremium"
  | "lpg"
  | "cng"
  | "lng"
  | "electric";

export interface LocationInput {
  lat: number;
  lon: number;
}

export interface GasPrice {
  type: FuelType;
  price: number;
  currency: string;
}

export interface GasStation {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  location: LocationInput;
  prices: GasPrice[];
  brand?: string;
  distanceKm?: number;
  metadata?: Record<string, unknown>;
}

export interface FuelProvider {
  country: string;

  searchStations(input: {
    location: LocationInput;
    radiusKm?: number;
    fuelType?: FuelType;
    limit?: number;
  }): Promise<GasStation[]>;
}
