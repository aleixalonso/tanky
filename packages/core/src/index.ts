import type {
  FuelProvider,
  FuelType,
  GasStation,
  LocationInput,
} from "@tanky/types";

export interface SearchStationsOptions {
  country: string;
  location: LocationInput;
  radiusKm?: number;
  fuelType?: FuelType;
  limit?: number;
}
export type StationSort = "distance" | "price";

export interface GetNearestStationsOptions extends SearchStationsOptions {
  sort?: StationSort;
}

export interface ProviderRegistry {
  register(provider: FuelProvider): void;
  get(country: string): FuelProvider | undefined;
  list(): FuelProvider[];
}

const EARTH_RADIUS_KM = 6371;

class InMemoryProviderRegistry implements ProviderRegistry {
  private providers = new Map<string, FuelProvider>();

  register(provider: FuelProvider): void {
    this.providers.set(provider.country.toUpperCase(), provider);
  }

  get(country: string): FuelProvider | undefined {
    return this.providers.get(country.toUpperCase());
  }

  list(): FuelProvider[] {
    return [...this.providers.values()];
  }
}

export const providerRegistry: ProviderRegistry =
  new InMemoryProviderRegistry();

export function registerProvider(provider: FuelProvider): void {
  providerRegistry.register(provider);
}

export function haversineDistanceKm(
  from: LocationInput,
  to: LocationInput,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterByRadius(
  stations: GasStation[],
  location: LocationInput,
  radiusKm?: number,
): GasStation[] {
  return stations.filter((station) => {
    const distanceKm =
      station.distanceKm ?? haversineDistanceKm(location, station.location);
    return radiusKm === undefined || distanceKm <= radiusKm;
  });
}

export function sortByPrice(
  stations: GasStation[],
  fuelType?: FuelType,
): GasStation[] {
  return [...stations].sort((left, right) => {
    const leftPrice = getStationPrice(left, fuelType);
    const rightPrice = getStationPrice(right, fuelType);

    if (leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }

    return (left.distanceKm ?? Number.POSITIVE_INFINITY) -
      (right.distanceKm ?? Number.POSITIVE_INFINITY);
  });
}

export function sortByDistance(stations: GasStation[]): GasStation[] {
  return [...stations].sort(
    (left, right) =>
      (left.distanceKm ?? Number.POSITIVE_INFINITY) -
      (right.distanceKm ?? Number.POSITIVE_INFINITY),
  );
}

export async function searchStations(
  options: SearchStationsOptions,
): Promise<GasStation[]> {
  const provider = providerRegistry.get(options.country);

  if (!provider) {
    throw new Error(`No provider registered for country: ${options.country}`);
  }

  const stations = await provider.searchStations({
    location: options.location,
    radiusKm: options.radiusKm,
    fuelType: options.fuelType,
    limit: options.limit,
  });

  const withDistance = stations.map((station) => ({
    ...station,
    distanceKm: haversineDistanceKm(options.location, station.location),
  }));

  const filtered = filterByRadius(
    withDistance,
    options.location,
    options.radiusKm,
  );
  const sorted = options.fuelType
    ? sortByPrice(filtered, options.fuelType)
    : sortByDistance(filtered);

  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

export async function getBestPrice(
  options: SearchStationsOptions,
): Promise<GasStation | undefined> {
  const stations = await searchStations({
    ...options,
    limit: options.limit ?? 25,
  });
  return sortByPrice(stations, options.fuelType)[0];
}

export async function getNearestStations(
  options: GetNearestStationsOptions,
): Promise<GasStation[]> {
  const stations = await searchStations({
    ...options,
    limit: undefined,
  });

  const sorted =
    options.sort === "price"
      ? sortByPrice(stations, options.fuelType)
      : sortByDistance(stations);

  return options.limit ? sorted.slice(0, options.limit) : sorted;
}

function getStationPrice(station: GasStation, fuelType?: FuelType): number {
  if (!fuelType) {
    return Math.min(...station.prices.map((entry) => entry.price));
  }

  const price = station.prices.find((entry) => entry.type === fuelType)?.price;
  return price ?? Number.POSITIVE_INFINITY;
}
