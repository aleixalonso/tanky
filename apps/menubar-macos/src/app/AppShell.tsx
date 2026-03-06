import { registerProvider } from "@tanky/core";
import { SpainFuelProvider } from "@tanky/provider-es";
import { isTauri } from "@tauri-apps/api/core";
import {
  PhysicalSize,
  currentMonitor,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshIcon, SettingsIcon, TrophyIcon } from "../components/icons";
import {
  DEFAULT_CONFIG,
  FUEL_LABELS,
  type FuelLookupConfig,
  SETTINGS_STORAGE_KEY,
  parseStoredConfig,
} from "../config/defaultConfig";
import { useBestPrice } from "../hooks/useBestPrice";
import { BestView } from "../views/BestView";
import { SettingsView } from "../views/SettingsView";

registerProvider(new SpainFuelProvider({ cacheStore: null }));

function getInitialConfig(): FuelLookupConfig {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_CONFIG;
  }

  return parseStoredConfig(stored) ?? DEFAULT_CONFIG;
}

export function AppShell() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeView, setActiveView] = useState<"best" | "settings">("best");
  const [config, setConfig] = useState<FuelLookupConfig>(getInitialConfig);
  const { state, selectedPrice, loadBestPrice } = useBestPrice(config);
  const fuelLabel = FUEL_LABELS[config.fuelType] ?? config.fuelType;

  const saveConfig = useCallback((nextConfig: FuelLookupConfig) => {
    setConfig(nextConfig);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextConfig));
  }, []);

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
        desiredPhysicalHeight,
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
              <h1>{activeView === "best" ? "Best fuel nearby" : "Settings"}</h1>
            </div>
            {activeView === "best" && (
              <div className="header-actions">
                <div className="fuel-pill">{fuelLabel}</div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => void loadBestPrice()}
                  aria-label="Refresh"
                >
                  <RefreshIcon />
                </button>
              </div>
            )}
          </header>

          <section className="content">
            {activeView === "best" ? (
              <BestView state={state} selectedPrice={selectedPrice} />
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
