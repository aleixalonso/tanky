import { describe, expect, it } from "vitest";

import { normalizeStation, parseSpanishNumber } from "./index";

describe("@tanky/provider-es", () => {
  it("parses comma decimals", () => {
    expect(parseSpanishNumber("1,579")).toBe(1.579);
  });

  it("normalizes a Spanish station record", () => {
    const station = normalizeStation({
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
    });

    expect(station?.country).toBe("ES");
    expect(station?.prices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "gasoline95", price: 1.579 }),
        expect.objectContaining({ type: "diesel", price: 1.489 }),
      ]),
    );
  });
});
