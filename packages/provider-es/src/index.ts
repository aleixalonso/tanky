import type {
  FuelProvider,
  FuelType,
  GasStation,
  LocationInput,
} from "@tanky/types";
import {
  HttpSpainFuelApiClient,
  type SpainFuelApiClient,
  type SpanishStationRecord,
} from "./client";

const fuelFieldMap: Record<string, FuelType> = {
  "Precio Gasolina 95 E5": "gasoline95",
  "Precio Gasolina 95 E10": "gasoline95",
  "Precio Gasolina 95 E5 Premium": "gasoline95",
  "Precio Gasolina 98 E5": "gasoline98",
  "Precio Gasolina 98 E10": "gasoline98",
  "Precio Gasoleo A": "diesel",
  "Precio Gasoleo Premium": "dieselPremium",
  "Precio Gases licuados del petróleo": "lpg",
  "Precio Gas Natural Comprimido": "cng",
  "Precio Gas Natural Licuado": "lng",
};

const DEFAULT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type SpainFuelProviderOptions = {
  cacheTtlMs?: number;
  client?: SpainFuelApiClient;
};

export class SpainFuelProvider implements FuelProvider {
  country = "ES";
  private readonly client: SpainFuelApiClient;
  private readonly cacheTtlMs: number;
  private normalizedStationsCache:
    | {
        stations: GasStation[];
        expiresAt: number;
      }
    | undefined;
  private pendingNormalizedStations: Promise<GasStation[]> | undefined;

  constructor(options: SpainFuelProviderOptions = {}) {
    this.client = options.client ?? new HttpSpainFuelApiClient();
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  async searchStations(input: {
    location: LocationInput;
    radiusKm?: number;
    fuelType?: FuelType;
    limit?: number;
  }): Promise<GasStation[]> {
    const normalized = await this.getNormalizedStations();

    const filteredByFuel = input.fuelType
      ? normalized.filter((station) =>
          station.prices.some((price) => price.type === input.fuelType),
        )
      : normalized;
    return filteredByFuel;
  }

  clearCache(): void {
    this.normalizedStationsCache = undefined;
    this.pendingNormalizedStations = undefined;
  }

  private async getNormalizedStations(): Promise<GasStation[]> {
    const cached = this.normalizedStationsCache;
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.stations;
    }

    if (!this.pendingNormalizedStations) {
      this.pendingNormalizedStations = this.client
        .getStations()
        .then((payload) => {
          const stations = payload.ListaEESSPrecio.map(normalizeStation).filter(
            (station): station is GasStation => station !== undefined,
          );

          this.normalizedStationsCache = {
            stations,
            expiresAt: Date.now() + this.cacheTtlMs,
          };

          return stations;
        })
        .finally(() => {
          this.pendingNormalizedStations = undefined;
        });
    }

    return this.pendingNormalizedStations;
  }
}

export function normalizeStation(
  record: SpanishStationRecord,
): GasStation | undefined {
  const lat = parseSpanishNumber(record.Latitud);
  const lon = parseSpanishNumber(record["Longitud (WGS84)"]);

  if (lat === undefined || lon === undefined) {
    return undefined;
  }

  const priceMap = new Map<FuelType, number>();

  for (const [field, fuelType] of Object.entries(fuelFieldMap)) {
    const rawValue = record[field as keyof SpanishStationRecord];
    const price = parseSpanishNumber(rawValue);

    if (price !== undefined) {
      const currentPrice = priceMap.get(fuelType);
      if (currentPrice === undefined || price < currentPrice) {
        priceMap.set(fuelType, price);
      }
    }
  }

  return {
    id: record.IDEESS,
    name: record.Rótulo || `${record.Municipio} ${record.Dirección}`,
    address: record.Dirección,
    city: record.Municipio || record.Localidad,
    postalCode: record["C.P."],
    country: "ES",
    brand: record.Rótulo,
    location: { lat, lon },
    prices: [...priceMap.entries()].map(([type, price]) => ({
      type,
      price,
      currency: "EUR",
    })),
    metadata: {
      locality: record.Localidad,
      province: record.Provincia,
      schedule: record.Horario,
      margin: record.Margen,
      updatedAt: record.Remisión,
    },
  };
}

export function parseSpanishNumber(
  value: string | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(",", ".").trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createSpainProvider(
  options: SpainFuelProviderOptions = {},
): FuelProvider {
  return new SpainFuelProvider(options);
}

export {
  HttpSpainFuelApiClient,
  type DatasetResponse,
  type SpainFuelApiClient,
  type SpanishStationRecord,
} from "./client";
