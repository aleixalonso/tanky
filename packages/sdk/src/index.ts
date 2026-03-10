import {
  getBestPrice as coreGetBestPrice,
  getNearestStations as coreGetNearestStations,
  searchStations as coreSearchStations,
  registerProvider,
  type GetNearestStationsOptions,
  type SearchStationsOptions,
} from "@tanky/core";
import {
  createSpainProvider,
  HttpSpainFuelApiClient,
  type SpainFuelApiClient,
} from "@tanky/provider-es";
import type { FuelProvider, GasStation } from "@tanky/types";

type SupportedCountry = "ES";

export interface TankySdkOptions {
  countryProviders?: Partial<Record<SupportedCountry, FuelProvider>>;
  countryClients?: Partial<Record<SupportedCountry, SpainFuelApiClient>>;
}

export class TankySdk {
  private readonly countryProviders = new Map<string, FuelProvider>();
  private readonly initializedCountries = new Set<string>();
  private readonly countryClients: TankySdkOptions["countryClients"];

  constructor(options: TankySdkOptions = {}) {
    this.countryClients = options.countryClients;

    for (const [country, provider] of Object.entries(
      options.countryProviders ?? {},
    )) {
      if (provider) {
        this.countryProviders.set(country.toUpperCase(), provider);
      }
    }
  }

  async searchStations(
    options: SearchStationsOptions,
  ): Promise<GasStation[]> {
    this.ensureProvider(options.country);
    return coreSearchStations(options);
  }

  async getNearestStations(
    options: GetNearestStationsOptions,
  ): Promise<GasStation[]> {
    this.ensureProvider(options.country);
    return coreGetNearestStations(options);
  }

  async getBestPrice(
    options: SearchStationsOptions,
  ): Promise<GasStation | undefined> {
    this.ensureProvider(options.country);
    return coreGetBestPrice(options);
  }

  clearCache(country: string): void {
    const normalizedCountry = country.toUpperCase();
    const provider = this.resolveProvider(normalizedCountry);

    if (
      provider &&
      "clearCache" in provider &&
      typeof provider.clearCache === "function"
    ) {
      provider.clearCache();
    }
  }

  private ensureProvider(country: string): void {
    const normalizedCountry = country.toUpperCase();
    if (this.initializedCountries.has(normalizedCountry)) {
      return;
    }

    const provider = this.resolveProvider(normalizedCountry);
    if (!provider) {
      throw new Error(`No provider configured for country: ${normalizedCountry}`);
    }

    registerProvider(provider);
    this.initializedCountries.add(normalizedCountry);
  }

  private resolveProvider(country: string): FuelProvider | undefined {
    const configuredProvider = this.countryProviders.get(country);
    if (configuredProvider) {
      return configuredProvider;
    }

    if (country === "ES") {
      const provider = createSpainProvider({
        client: this.countryClients?.ES,
      });
      this.countryProviders.set(country, provider);
      return provider;
    }

    return undefined;
  }
}

const defaultSdk = new TankySdk();

export function createTankySdk(options: TankySdkOptions = {}): TankySdk {
  return new TankySdk(options);
}

export function searchStations(
  options: SearchStationsOptions,
): Promise<GasStation[]> {
  return defaultSdk.searchStations(options);
}

export function getNearestStations(
  options: GetNearestStationsOptions,
): Promise<GasStation[]> {
  return defaultSdk.getNearestStations(options);
}

export function getBestPrice(
  options: SearchStationsOptions,
): Promise<GasStation | undefined> {
  return defaultSdk.getBestPrice(options);
}

export type {
  GetNearestStationsOptions,
  SearchStationsOptions,
  StationSort,
} from "@tanky/core";
export type {
  FuelProvider,
  FuelType,
  GasPrice,
  GasStation,
  LocationInput,
} from "@tanky/types";
export type { SpainFuelApiClient } from "@tanky/provider-es";
export { HttpSpainFuelApiClient } from "@tanky/provider-es";
