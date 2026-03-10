import { type GasStation, type StationSort } from "@tanky/sdk";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import type { FuelLookupConfig } from "../config/defaultConfig";
import { tankySdk } from "../lib/tankySdk";

export type NearbyStationsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; stations: GasStation[] };

export function useNearestStations(
  config: FuelLookupConfig,
  sort: StationSort,
) {
  const [state, setState] = useState<NearbyStationsState>({
    status: "loading",
  });

  const loadNearestStations = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const stations = await tankySdk.getNearestStations({
        country: config.country,
        location: config.location,
        fuelType: config.fuelType,
        radiusKm: config.radiusKm,
        limit: 8,
        sort,
      });

      setState({ status: "success", stations });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: "error", message });
    }
  }, [config.country, config.fuelType, config.location, config.radiusKm, sort]);

  useEffect(() => {
    void loadNearestStations();
  }, [config.country, loadNearestStations]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen("tray-refresh", () => {
      tankySdk.clearCache(config.country);
      void loadNearestStations();
    }).then((cleanup) => {
      unlisten = cleanup;
    });

    return () => {
      unlisten?.();
    };
  }, [loadNearestStations]);

  return {
    state,
    loadNearestStations,
  };
}
