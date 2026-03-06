import type { GasStation } from "@tanky/types";
import { describe, expect, it } from "vitest";

import { haversineDistanceKm, sortByDistance, sortByPrice } from "./index";

const stations: GasStation[] = [
  {
    id: "a",
    name: "A",
    address: "One",
    city: "Barcelona",
    country: "ES",
    location: { lat: 41.39, lon: 2.17 },
    distanceKm: 2,
    prices: [{ type: "gasoline95", price: 1.6, currency: "EUR" }],
  },
  {
    id: "b",
    name: "B",
    address: "Two",
    city: "Barcelona",
    country: "ES",
    location: { lat: 41.4, lon: 2.18 },
    distanceKm: 1,
    prices: [{ type: "gasoline95", price: 1.5, currency: "EUR" }],
  },
];

describe("@tanky/core", () => {
  it("calculates haversine distance", () => {
    const distance = haversineDistanceKm(
      { lat: 41.39, lon: 2.17 },
      { lat: 41.4, lon: 2.18 },
    );

    expect(distance).toBeGreaterThan(1);
    expect(distance).toBeLessThan(2);
  });

  it("sorts stations by price", () => {
    expect(
      sortByPrice(stations, "gasoline95").map((station) => station.id),
    ).toEqual(["b", "a"]);
  });

  it("sorts stations by distance", () => {
    expect(sortByDistance(stations).map((station) => station.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
