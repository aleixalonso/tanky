import { getBestPrice, registerProvider } from "@tanky/core";
import { SpainFuelProvider } from "@tanky/provider-es";
import type { FuelType, GasStation } from "@tanky/types";
import { emit, listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useState } from "react";

const CONFIG = {
  country: "ES",
  location: {
    lat: 41.39,
    lon: 2.17,
  },
  fuelType: "gasoline95" as FuelType,
  radiusKm: 5,
};

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; station: GasStation };

registerProvider(new SpainFuelProvider({ cacheStore: null }));

export function App() {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  const loadBestPrice = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const station = await getBestPrice({
        country: CONFIG.country,
        location: CONFIG.location,
        fuelType: CONFIG.fuelType,
        radiusKm: CONFIG.radiusKm,
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
  }, []);

  useEffect(() => {
    loadBestPrice();
  }, [loadBestPrice]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void listen("tray-refresh", () => {
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
      state.station.prices.find((price) => price.type === CONFIG.fuelType) ??
      null
    );
  }, [state]);

  return (
    <main className="panel-shell">
      <div className="tray-arrow" />
      <section className="panel-surface">
        <header className="header">
          <div>
            <p className="label">Tanky</p>
            <h1>Best fuel nearby</h1>
          </div>
          <div className="fuel-pill">{CONFIG.fuelType}</div>
        </header>

        <section className="content">
          {state.status === "loading" && (
            <p className="state-text">Loading prices...</p>
          )}

          {state.status === "error" && (
            <div className="state-block error">
              <p>Could not load fuel prices.</p>
              <small>{state.message}</small>
            </div>
          )}

          {state.status === "success" && (
            <article className="station-card">
              <p className="meta-row">Best nearby station</p>
              <h2>{state.station.name}</h2>
              <p className="price">
                {selectedPrice
                  ? `${selectedPrice.price.toFixed(3)} ${selectedPrice.currency}`
                  : "-"}
              </p>
              <p className="meta">
                {state.station.distanceKm?.toFixed(2) ?? "-"} km away
              </p>
              <p className="address">{state.station.address}</p>
            </article>
          )}
        </section>

        <footer className="actions">
          <button type="button" onClick={() => void loadBestPrice()}>
            Refresh
          </button>
          <button
            type="button"
            className="quit"
            onClick={() => void emit("quit-requested")}
          >
            Quit
          </button>
        </footer>
      </section>
    </main>
  );
}
