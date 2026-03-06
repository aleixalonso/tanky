import { describe, expect, it } from "vitest";

import type { FuelProvider, GasStation } from "./index";

describe("@tanky/types", () => {
  it("defines the expected station contract shape", () => {
    const station: GasStation = {
      id: "station-1",
      name: "Tanky Demo",
      address: "Example Street 1",
      city: "Barcelona",
      country: "ES",
      location: { lat: 41.39, lon: 2.17 },
      prices: [{ type: "gasoline95", price: 1.579, currency: "EUR" }],
    };

    const provider: FuelProvider = {
      country: "ES",
      async searchStations() {
        return [station];
      },
    };

    expect(provider.country).toBe("ES");
    expect(station.prices[0]?.type).toBe("gasoline95");
  });
});
