import type {
  FuelProvider,
  FuelType,
  GasStation,
  LocationInput,
} from "@tanky/types";
import { cachedFetch } from "./cache/cached-fetch";
import type { CacheEntry, CacheStore } from "./cache/cache-store";

export { cachedFetch };
export type { CacheEntry, CacheStore } from "./cache/cache-store";

const DATASET_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const DATASET_CACHE_KEY = "provider-es:stations";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

interface SpanishStationRecord {
  "C.P.": string;
  Dirección: string;
  Horario: string;
  Latitud: string;
  Localidad: string;
  "Longitud (WGS84)": string;
  Margen: string;
  Municipio: string;
  Provincia: string;
  Remisión: string;
  Rótulo: string;
  "Precio Biodiesel": string;
  "Precio Bioetanol": string;
  "Precio Gas Natural Comprimido": string;
  "Precio Gas Natural Licuado": string;
  "Precio Gases licuados del petróleo": string;
  "Precio Gasoleo A": string;
  "Precio Gasoleo B": string;
  "Precio Gasoleo Premium": string;
  "Precio Gasolina 95 E10": string;
  "Precio Gasolina 95 E5": string;
  "Precio Gasolina 95 E5 Premium": string;
  "Precio Gasolina 98 E10": string;
  "Precio Gasolina 98 E5": string;
  IDEESS: string;
  IDMunicipio: string;
  IDProvincia: string;
  IDCCAA: string;
}

interface DatasetResponse {
  Fecha: string;
  ListaEESSPrecio: SpanishStationRecord[];
  Nota: string;
  ResultadoConsulta: string;
}

interface SpainFuelProviderOptions {
  cacheStore?: CacheStore | null;
  cacheDir?: string;
  nowMs?: () => number;
}

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

export class SpainFuelProvider implements FuelProvider {
  country = "ES";
  private readonly cacheStore: CacheStore | null;
  private readonly nowMs: () => number;

  constructor(options: SpainFuelProviderOptions = {}) {
    this.nowMs = options.nowMs ?? Date.now;
    this.cacheStore = options.cacheStore ?? new LazyFileCacheStore(options.cacheDir);
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

  private async getNormalizedStations(): Promise<GasStation[]> {
    const stations = await cachedFetch<GasStation[]>({
      key: DATASET_CACHE_KEY,
      ttlMs: CACHE_TTL_MS,
      cacheStore: this.cacheStore,
      nowMs: this.nowMs(),
      fetchFresh: async () => {
        const response = await fetch(DATASET_URL, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch Spanish fuel dataset: ${response.status}`,
          );
        }

        const payload = (await response.json()) as DatasetResponse;
        return payload.ListaEESSPrecio.map(normalizeStation).filter(
          (station): station is GasStation => station !== undefined,
        );
      },
    });

    if (stations === null) {
      throw new Error("Failed to fetch Spanish fuel dataset");
    }

    return stations;
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

export function createSpainProvider(): FuelProvider {
  return new SpainFuelProvider();
}

class LazyFileCacheStore implements CacheStore {
  private readonly cacheDir?: string;
  private storePromise: Promise<CacheStore | null> | undefined;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir;
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const store = await this.getStore();
    return store ? store.get<T>(key) : null;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    const store = await this.getStore();

    if (store) {
      await store.set(key, entry);
    }
  }

  private async getStore(): Promise<CacheStore | null> {
    if (!this.storePromise) {
      this.storePromise = this.createStore();
    }

    return this.storePromise;
  }

  private async createStore(): Promise<CacheStore | null> {
    if (isBrowserEnvironment()) {
      return null;
    }

    try {
      const fileCacheStoreModulePath = "./cache/file-cache-store";
      const { FileCacheStore } = await import(
        /* @vite-ignore */ fileCacheStoreModulePath
      );

      return new FileCacheStore(this.cacheDir ?? (await getDefaultCacheDirectory()));
    } catch {
      return null;
    }
  }
}

function isBrowserEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.document !== "undefined"
  );
}

async function getDefaultCacheDirectory(): Promise<string> {
  const osModule = "node:os";
  const pathModule = "node:path";
  const { homedir } = await import(/* @vite-ignore */ osModule);
  const { join } = await import(/* @vite-ignore */ pathModule);
  return join(homedir(), ".cache", "tanky", "provider-es");
}
