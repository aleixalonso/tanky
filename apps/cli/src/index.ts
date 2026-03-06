import { getBestPrice, getNearestStations, registerProvider } from "@tanky/core";
import { createSpainProvider } from "@tanky/provider-es";
import type { FuelType, GasStation } from "@tanky/types";
import { Command } from "commander";

const DEFAULT_COUNTRY = "ES";
const DEFAULT_RADIUS_KM = 5;

registerProvider(createSpainProvider());

const program = new Command();

program
  .name("tanky")
  .description("Retrieve fuel prices near a location")
  .showHelpAfterError();

program
  .command("best")
  .description("Find the best fuel price near a location")
  .requiredOption("--lat <lat>", "Latitude", parseNumber)
  .requiredOption("--lon <lon>", "Longitude", parseNumber)
  .option("--fuel <fuelType>", "Fuel type", "gasoline95")
  .option(
    "--radius <radius>",
    "Search radius in kilometers",
    parseNumber,
    DEFAULT_RADIUS_KM,
  )
  .option("--country <country>", "Country code", DEFAULT_COUNTRY)
  .option("--json", "Return JSON output", false)
  .action(async (options) => {
    const station = await getBestPrice({
      country: options.country,
      location: { lat: options.lat, lon: options.lon },
      radiusKm: options.radius,
      fuelType: options.fuel as FuelType,
    });

    if (!station) {
      console.error("No stations found.");
      process.exitCode = 1;
      return;
    }

    outputStations([station], options.json, options.fuel as FuelType);
  });

program
  .command("near")
  .description("List the nearest stations to a location")
  .requiredOption("--lat <lat>", "Latitude", parseNumber)
  .requiredOption("--lon <lon>", "Longitude", parseNumber)
  .option(
    "--radius <radius>",
    "Search radius in kilometers",
    parseNumber,
    DEFAULT_RADIUS_KM,
  )
  .option("--fuel <fuelType>", "Fuel type filter")
  .option("--country <country>", "Country code", DEFAULT_COUNTRY)
  .option("--limit <limit>", "Maximum stations to return", parseInteger, 10)
  .option("--json", "Return JSON output", false)
  .action(async (options) => {
    const stations = await getNearestStations({
      country: options.country,
      location: { lat: options.lat, lon: options.lon },
      radiusKm: options.radius,
      fuelType: options.fuel as FuelType | undefined,
      limit: options.limit,
    });

    outputStations(
      stations,
      options.json,
      options.fuel as FuelType | undefined,
    );
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

function outputStations(
  stations: GasStation[],
  asJson: boolean,
  fuelType?: FuelType,
): void {
  if (asJson) {
    console.log(JSON.stringify(stations, null, 2));
    return;
  }

  console.table(
    stations.map((station) => ({
      id: station.id,
      name: station.name,
      city: station.city,
      distanceKm: station.distanceKm?.toFixed(2) ?? "-",
      price: formatPrice(station, fuelType),
      address: station.address,
    })),
  );
}

function formatPrice(station: GasStation, fuelType?: FuelType): string {
  const price = fuelType
    ? station.prices.find((entry) => entry.type === fuelType)
    : [...station.prices].sort((left, right) => left.price - right.price)[0];

  return price ? `${price.price.toFixed(3)} ${price.currency}` : "-";
}

function parseNumber(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return parsed;
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }

  return parsed;
}
