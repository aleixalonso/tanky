import { type GasStation } from "@tanky/sdk";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FuelLookupConfig } from "../config/defaultConfig";
import { tankySdk } from "../lib/tankySdk";

export type BestPriceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; station: GasStation };

export function useBestPrice(config: FuelLookupConfig) {
  const [state, setState] = useState<BestPriceState>({ status: "loading" });

  const loadBestPrice = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const station = await tankySdk.getBestPrice({
        country: config.country,
        location: config.location,
        fuelType: config.fuelType,
        radiusKm: config.radiusKm,
      });

      if (!station) {
        setState({
          status: "error",
          message: "No station found for the selected location.",
        });
        return;
      }

      setState({ status: "success", station });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: "error", message });
    }
  }, [config.country, config.fuelType, config.location, config.radiusKm]);

  useEffect(() => {
    void loadBestPrice();
  }, [config.country, loadBestPrice]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen("tray-refresh", () => {
      tankySdk.clearCache(config.country);
      void loadBestPrice();
    }).then((cleanup) => {
      unlisten = cleanup;
    });

    return () => {
      unlisten?.();
    };
  }, [loadBestPrice]);

  const selectedPrice = useMemo(() => {
    if (state.status !== "success") {
      return null;
    }

    return (
      state.station.prices.find((price) => price.type === config.fuelType) ??
      null
    );
  }, [config.fuelType, state]);

  return {
    state,
    selectedPrice,
    loadBestPrice,
  };
}
