import { getNearestStations } from "@tanky/core";
import type { GasStation } from "@tanky/types";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect } from "react";
import { useState } from "react";
import type { FuelLookupConfig } from "../config/defaultConfig";

export type NearbyStationsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; stations: GasStation[] };

export function useNearestStations(config: FuelLookupConfig) {
  const [state, setState] = useState<NearbyStationsState>({
    status: "loading",
  });

  const loadNearestStations = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const stations = await getNearestStations({
        country: config.country,
        location: config.location,
        fuelType: config.fuelType,
        radiusKm: config.radiusKm,
        limit: 8,
        sort: "distance",
      });

      setState({ status: "success", stations });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: "error", message });
    }
  }, [config.country, config.fuelType, config.location, config.radiusKm]);

  useEffect(() => {
    void loadNearestStations();
  }, [loadNearestStations]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen("tray-refresh", () => {
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
