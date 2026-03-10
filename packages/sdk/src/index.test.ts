import { describe, expect, it, vi } from "vitest";
import { createTankySdk } from "./index";

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
        "Precio Gases licuados del petróleo": "",
        "Precio Gasoleo A": "1,489",
        "Precio Gasoleo B": "",
        "Precio Gasoleo Premium": "",
        "Precio Gasolina 95 E10": "",
        "Precio Gasolina 95 E5": "1,579",
        "Precio Gasolina 95 E5 Premium": "",
        "Precio Gasolina 98 E10": "",
        "Precio Gasolina 98 E5": "",
        IDEESS: "1234",
        IDMunicipio: "1",
        IDProvincia: "8",
        IDCCAA: "9",
      },
    ],
  };
}

describe("@tanky/sdk", () => {
  it("auto-wires the Spain provider for best-price lookups", async () => {
    const sdk = createTankySdk({
      countryClients: {
        ES: {
          getStations: vi.fn(async () => createDatasetResponse()),
        },
      },
    });

    const station = await sdk.getBestPrice({
      country: "ES",
      location: { lat: 41.39, lon: 2.17 },
      fuelType: "gasoline95",
    });

    expect(station?.id).toBe("1234");
    expect(station?.prices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "gasoline95", price: 1.579 }),
      ]),
    );
  });

  it("reuses the configured client and clears the provider cache on demand", async () => {
    const getStations = vi.fn(async () => createDatasetResponse());
    const sdk = createTankySdk({
      countryClients: {
        ES: {
          getStations,
        },
      },
    });

    await sdk.getNearestStations({
      country: "ES",
      location: { lat: 41.39, lon: 2.17 },
      fuelType: "diesel",
    });
    await sdk.getNearestStations({
      country: "ES",
      location: { lat: 41.39, lon: 2.17 },
      fuelType: "gasoline95",
    });

    expect(getStations).toHaveBeenCalledTimes(1);

    sdk.clearCache("ES");

    await sdk.getNearestStations({
      country: "ES",
      location: { lat: 41.39, lon: 2.17 },
      fuelType: "diesel",
    });

    expect(getStations).toHaveBeenCalledTimes(2);
  });
});
