import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { normalizeStation, parseSpanishNumber, SpainFuelProvider } from "./index";

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
    const station = normalizeStation(createDatasetResponse().ListaEESSPrecio[0]);

    expect(station?.country).toBe("ES");
    expect(station?.prices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "gasoline95", price: 1.579 }),
        expect.objectContaining({ type: "diesel", price: 1.489 }),
      ]),
    );
  });

  it("reuses cache when age is within 12 hour TTL", async () => {
    let now = 0;
    const cacheDir = await mkdtemp(join(tmpdir(), "tanky-provider-es-"));
    const provider = new SpainFuelProvider({
      nowMs: () => now,
      cacheDir,
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      async json() {
        return createDatasetResponse();
      },
    }));

    vi.stubGlobal("fetch", fetchMock);

    try {
      await provider.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });

      now = 12 * 60 * 60 * 1000 - 1;

      await provider.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });
    } finally {
      vi.unstubAllGlobals();
      await rm(cacheDir, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when cache is older than 12 hour TTL", async () => {
    let now = 0;
    const cacheDir = await mkdtemp(join(tmpdir(), "tanky-provider-es-"));
    const provider = new SpainFuelProvider({
      nowMs: () => now,
      cacheDir,
    });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      async json() {
        return createDatasetResponse();
      },
    }));

    vi.stubGlobal("fetch", fetchMock);

    try {
      await provider.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });

      now = 12 * 60 * 60 * 1000 + 1;

      await provider.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });
    } finally {
      vi.unstubAllGlobals();
      await rm(cacheDir, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reuses persisted cache across instances while within TTL", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "tanky-provider-es-"));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      async json() {
        return createDatasetResponse();
      },
    }));

    vi.stubGlobal("fetch", fetchMock);

    try {
      const providerA = new SpainFuelProvider({
        cacheDir,
        nowMs: () => 0,
      });
      await providerA.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });

      const providerB = new SpainFuelProvider({
        cacheDir,
        nowMs: () => 1,
      });
      await providerB.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });
    } finally {
      vi.unstubAllGlobals();
      await rm(cacheDir, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns stale cache when fetch fails after TTL", async () => {
    let now = 0;
    const cacheDir = await mkdtemp(join(tmpdir(), "tanky-provider-es-"));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createDatasetResponse(),
      })
      .mockRejectedValueOnce(new Error("network"));

    vi.stubGlobal("fetch", fetchMock);

    try {
      const provider = new SpainFuelProvider({
        cacheDir,
        nowMs: () => now,
      });

      const first = await provider.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });

      now = 12 * 60 * 60 * 1000 + 1;

      const second = await provider.searchStations({
        location: { lat: 41.39, lon: 2.17 },
      });

      expect(second).toEqual(first);
    } finally {
      vi.unstubAllGlobals();
      await rm(cacheDir, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
