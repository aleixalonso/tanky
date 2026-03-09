import type { StationSort } from "@tanky/core";
import { isTauri } from "@tauri-apps/api/core";
import {
  PhysicalSize,
  currentMonitor,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPinIcon,
  RefreshIcon,
  SettingsIcon,
  TrophyIcon,
} from "../components/icons";
import {
  DEFAULT_CONFIG,
  FUEL_LABELS,
  type FuelLookupConfig,
  SETTINGS_STORAGE_KEY,
  parseStoredConfig,
} from "../config/defaultConfig";
import { useBestPrice } from "../hooks/useBestPrice";
import { useNearestStations } from "../hooks/useNearestStations";
import { spainProvider } from "../lib/providerRegistry";
import { BestView } from "../views/BestView";
import { NearbyView } from "../views/NearbyView";
import { SettingsView } from "../views/SettingsView";

const MIN_PANEL_HEIGHT_LOGICAL = 620;

function getInitialConfig(): FuelLookupConfig {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_CONFIG;
  }

  return parseStoredConfig(stored) ?? DEFAULT_CONFIG;
}

export function AppShell() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeView, setActiveView] = useState<"best" | "nearby" | "settings">(
    "best",
  );
  const [nearbySort, setNearbySort] = useState<StationSort>("distance");
  const [config, setConfig] = useState<FuelLookupConfig>(getInitialConfig);
  const { state, selectedPrice, loadBestPrice } = useBestPrice(config);
  const { state: nearbyState, loadNearestStations } = useNearestStations(
    config,
    nearbySort,
  );
  const fuelLabel = FUEL_LABELS[config.fuelType] ?? config.fuelType;
  const title =
    activeView === "best"
      ? "Best fuel nearby"
      : activeView === "nearby"
        ? "Nearby stations"
        : "Settings";

  const saveConfig = useCallback((nextConfig: FuelLookupConfig) => {
    setConfig(nextConfig);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextConfig));
  }, []);

  const updateFuelType = useCallback(
    (fuelType: FuelLookupConfig["fuelType"]) => {
      saveConfig({
        ...config,
        fuelType,
      });
    },
    [config, saveConfig],
  );

  const refreshActiveView = useCallback(() => {
    spainProvider.clearCache();

    if (activeView === "best") {
      void loadBestPrice();
      return;
    }

    if (activeView === "nearby") {
      void loadNearestStations();
    }
  }, [activeView, loadBestPrice, loadNearestStations]);

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;

    const resizeWindowToContent = async () => {
      if (cancelled) {
        return;
      }

      const scale = window.devicePixelRatio || 1;
      const desiredLogicalHeight = Math.ceil(container.scrollHeight);
      const desiredPhysicalHeight = Math.ceil(desiredLogicalHeight * scale);
      const targetPhysicalWidth = Math.ceil(400 * scale);
      const minPhysicalHeight = Math.ceil(MIN_PANEL_HEIGHT_LOGICAL * scale);

      let maxPhysicalHeight = Math.ceil(600 * scale);
      try {
        const monitor = await currentMonitor();
        if (monitor) {
          maxPhysicalHeight = Math.floor(monitor.size.height * 0.8);
        }
      } catch {
        // keep fallback
      }

      const targetPhysicalHeight = Math.min(
        Math.max(desiredPhysicalHeight, minPhysicalHeight),
        maxPhysicalHeight,
      );
      await getCurrentWindow().setSize(
        new PhysicalSize(targetPhysicalWidth, targetPhysicalHeight),
      );
    };

    void resizeWindowToContent();

    const observer = new ResizeObserver(() => {
      void resizeWindowToContent();
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <main ref={containerRef} className="panel-shell">
      <div className="tray-arrow" />
      <section className="panel-surface">
        <aside className="side-nav">
          <button
            type="button"
            className={`nav-btn ${activeView === "best" ? "active" : ""}`}
            aria-label="Best prices"
            onClick={() => setActiveView("best")}
          >
            <TrophyIcon />
          </button>
          <button
            type="button"
            className={`nav-btn ${activeView === "nearby" ? "active" : ""}`}
            aria-label="Nearby stations"
            onClick={() => setActiveView("nearby")}
          >
            <MapPinIcon />
          </button>
          <div className="nav-spacer" />
          <button
            type="button"
            className={`nav-btn ${activeView === "settings" ? "active" : ""}`}
            aria-label="Settings"
            onClick={() => setActiveView("settings")}
          >
            <SettingsIcon />
          </button>
        </aside>

        <section className="panel-main">
          <header className="header">
            <div>
              <p className="label">Tanky</p>
              <h1>{title}</h1>
            </div>
            {(activeView === "best" || activeView === "nearby") && (
              <div className="header-actions">
                {activeView === "best" && (
                  <div className="fuel-pill">{fuelLabel}</div>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={refreshActiveView}
                  aria-label="Refresh"
                >
                  <RefreshIcon />
                </button>
              </div>
            )}
          </header>

          <section
            className={`content ${
              activeView === "nearby" ? "content-nearby" : ""
            }`}
          >
            {activeView === "best" ? (
              <BestView state={state} selectedPrice={selectedPrice} />
            ) : activeView === "nearby" ? (
              <NearbyView
                state={nearbyState}
                fuelType={config.fuelType}
                sort={nearbySort}
                onFuelTypeChange={updateFuelType}
                onSortChange={setNearbySort}
              />
            ) : (
              <SettingsView config={config} onSave={saveConfig} />
            )}
          </section>

          <footer className="panel-footer">Tanky 0.1.0</footer>
        </section>
      </section>
    </main>
  );
}
