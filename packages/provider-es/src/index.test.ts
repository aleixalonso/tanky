import type { GasStation } from "@tanky/types";
import { describe, expect, it, vi } from "vitest";

import {
  HttpSpainFuelApiClient,
  SpainFuelProvider,
  normalizeStation,
  parseSpanishNumber,
} from "./index";

function createDatasetResponse() {
  return {
    Fecha: "2026-03-06T00:00:00",
    Nota: "",
    ResultadoConsulta: "OK",
    ListaEESSPrecio: [
      {
        "C.P.": "08001",
        Dirección: "Carrer Example 1",
        Horario: "L-D: 24H",
        Latitud: "41,390",
        Localidad: "Barcelona",
        "Longitud (WGS84)": "2,170",
        Margen: "D",
        Municipio: "Barcelona",
        Provincia: "Barcelona",
        Remisión: "2026-03-06T00:00:00",
        Rótulo: "Tanky Station",
        "Precio Biodiesel": "",
        "Precio Bioetanol": "",
        "Precio Gas Natural Comprimido": "",
        "Precio Gas Natural Licuado": "",
        "Precio Gases licuados del petróleo": "0,999",
        "Precio Gasoleo A": "1,489",
        "Precio Gasoleo B": "",
        "Precio Gasoleo Premium": "1,539",
        "Precio Gasolina 95 E10": "",
        "Precio Gasolina 95 E5": "1,579",
        "Precio Gasolina 95 E5 Premium": "",
        "Precio Gasolina 98 E10": "",
        "Precio Gasolina 98 E5": "1,689",
        IDEESS: "1234",
        IDMunicipio: "1",
        IDProvincia: "8",
        IDCCAA: "9",
      },
    ],
  };
}

describe("@tanky/provider-es", () => {
  it("parses comma decimals", () => {
    expect(parseSpanishNumber("1,579")).toBe(1.579);
  });

  it("normalizes a Spanish station record", () => {
    const station = normalizeStation(
      createDatasetResponse().ListaEESSPrecio[0],
    );

    expect(station?.country).toBe("ES");
    expect(station?.prices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "gasoline95", price: 1.579 }),
        expect.objectContaining({ type: "diesel", price: 1.489 }),
      ]),
    );
  });

  it("fetches and normalizes stations from the dataset", async () => {
    const client = {
      async getStations() {
        return createDatasetResponse();
      },
    };
    const provider = new SpainFuelProvider(client);

    const stations: GasStation[] = await provider.searchStations({
      location: { lat: 41.39, lon: 2.17 },
    });

    expect(stations).toHaveLength(1);
  });

  it("filters stations by fuel type after fetching", async () => {
    const client = {
      async getStations() {
        return createDatasetResponse();
      },
    };
    const provider = new SpainFuelProvider(client);

    const stations: GasStation[] = await provider.searchStations({
      location: { lat: 41.39, lon: 2.17 },
      fuelType: "lng",
    });

    expect(stations).toEqual([]);
  });

  it("reuses the in-memory dataset cache across searches", async () => {
    const client = {
      getStations: vi.fn(async () => createDatasetResponse()),
    };
    const provider = new SpainFuelProvider(client);

    await provider.searchStations({
      location: { lat: 41.39, lon: 2.17 },
      fuelType: "gasoline95",
    });
    await provider.searchStations({
      location: { lat: 41.39, lon: 2.17 },
      fuelType: "diesel",
    });

    expect(client.getStations).toHaveBeenCalledTimes(1);
  });

  it("invalidates the in-memory cache on demand", async () => {
    const client = {
      getStations: vi.fn(async () => createDatasetResponse()),
    };
    const provider = new SpainFuelProvider(client);

    await provider.searchStations({
      location: { lat: 41.39, lon: 2.17 },
    });
    provider.clearCache();
    await provider.searchStations({
      location: { lat: 41.39, lon: 2.17 },
    });

    expect(client.getStations).toHaveBeenCalledTimes(2);
  });

  it("delegates dataset fetching to the HTTP client", async () => {
    const client = new HttpSpainFuelApiClient();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      async json() {
        return createDatasetResponse();
      },
    }));

    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(client.getStations()).resolves.toEqual(
        createDatasetResponse(),
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("throws when the HTTP client request fails", async () => {
    const client = new HttpSpainFuelApiClient();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
    }));

    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(client.getStations()).rejects.toThrow(
        "Failed to fetch Spanish fuel dataset: 503",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
