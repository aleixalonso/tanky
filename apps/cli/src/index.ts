import { getBestPrice, getNearestStations, registerProvider } from "@tanky/core";
import { createSpainProvider } from "@tanky/provider-es";
import type { FuelType, GasStation } from "@tanky/types";
import { Command } from "commander";

const DEFAULT_COUNTRY = "ES";
const DEFAULT_RADIUS_KM = 5;
const DEFAULT_LIMIT = 10;
const SUPPORTED_FUEL_TYPES: FuelType[] = [
  "gasoline95",
  "gasoline98",
  "diesel",
  "dieselPremium",
  "lpg",
  "cng",
  "lng",
  "electric",
];

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
  .option("--fuel <fuelType>", "Fuel type filter", parseFuelType)
  .option(
    "--radius <radius>",
    "Search radius in kilometers",
    parsePositiveNumber,
    DEFAULT_RADIUS_KM,
  )
  .option("--limit <limit>", "Maximum stations to evaluate", parsePositiveInteger, DEFAULT_LIMIT)
  .option("--country <country>", "Country code", DEFAULT_COUNTRY)
  .option("--json", "Return JSON output", false)
  .action(async (options) => {
    if (!options.fuel) {
      throw new Error(
        "The --fuel option is required for 'best'. Example: tanky best --lat 41.39 --lon 2.17 --fuel gasoline95 --radius 5",
      );
    }

    const station = await getBestPrice({
      country: options.country,
      location: { lat: options.lat, lon: options.lon },
      radiusKm: options.radius,
      fuelType: options.fuel,
      limit: options.limit,
    });

    if (!station) {
      console.error("No stations found.");
      process.exitCode = 1;
      return;
    }

    outputStations([station], options.json, options.fuel);
  });

program
  .command("near")
  .description("List the nearest stations to a location")
  .requiredOption("--lat <lat>", "Latitude", parseNumber)
  .requiredOption("--lon <lon>", "Longitude", parseNumber)
  .option(
    "--radius <radius>",
    "Search radius in kilometers",
    parsePositiveNumber,
    DEFAULT_RADIUS_KM,
  )
  .option("--fuel <fuelType>", "Fuel type filter", parseFuelType)
  .option("--country <country>", "Country code", DEFAULT_COUNTRY)
  .option("--limit <limit>", "Maximum stations to return", parsePositiveInteger, DEFAULT_LIMIT)
  .option("--json", "Return JSON output", false)
  .action(async (options) => {
    const stations = await getNearestStations({
      country: options.country,
      location: { lat: options.lat, lon: options.lon },
      radiusKm: options.radius,
      fuelType: options.fuel,
      limit: options.limit,
    });

    outputStations(stations, options.json, options.fuel);
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

  const rows = stations.map((station) => ({
    name: station.name,
    price: formatPrice(station, fuelType),
    distance: station.distanceKm?.toFixed(2) ?? "-",
    address: station.address,
  }));

  if (rows.length === 0) {
    console.log("_No stations found._");
    return;
  }

  for (const [index, row] of rows.entries()) {
    console.log(`### ${index + 1}. ${escapeMarkdownCell(row.name)}`);
    console.log(`- Price: ${escapeMarkdownCell(row.price)}`);
    console.log(`- Distance (km): ${escapeMarkdownCell(row.distance)}`);
    console.log(`- Address: ${escapeMarkdownCell(row.address)}`);
    console.log("");
  }
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

function parsePositiveNumber(value: string): number {
  const parsed = parseNumber(value);

  if (parsed <= 0) {
    throw new Error(`Expected a positive number, got: ${value}`);
  }

  return parsed;
}

function parsePositiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, got: ${value}`);
  }

  return parsed;
}

function parseFuelType(value: string): FuelType {
  if (!SUPPORTED_FUEL_TYPES.includes(value as FuelType)) {
    throw new Error(
      `Unsupported fuel type: ${value}. Supported values: ${SUPPORTED_FUEL_TYPES.join(", ")}`,
    );
  }

  return value as FuelType;
}

function escapeMarkdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
