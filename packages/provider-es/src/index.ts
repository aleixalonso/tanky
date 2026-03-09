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

export class SpainFuelProvider implements FuelProvider {
  country = "ES";

  constructor(
    private readonly client: SpainFuelApiClient = new HttpSpainFuelApiClient(),
  ) {}

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
    const payload = await this.client.getStations();
    return payload.ListaEESSPrecio.map(normalizeStation).filter(
      (station): station is GasStation => station !== undefined,
    );
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

export {
  HttpSpainFuelApiClient,
  type DatasetResponse,
  type SpainFuelApiClient,
  type SpanishStationRecord,
} from "./client";
