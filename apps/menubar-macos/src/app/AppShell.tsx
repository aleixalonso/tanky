import { registerProvider } from "@tanky/core";
import { SpainFuelProvider } from "@tanky/provider-es";
import { useMemo, useState } from "react";
import {
  FuelIcon,
  RefreshIcon,
  SettingsIcon,
} from "../components/icons/NavIcons";
import { DEFAULT_CONFIG } from "../config/defaultConfig";
import { useBestPrice } from "../hooks/useBestPrice";
import { BestView } from "../views/BestView";
import { SettingsView } from "../views/SettingsView";

registerProvider(new SpainFuelProvider({ cacheStore: null }));

export function AppShell() {
  const [activeView, setActiveView] = useState<"best" | "settings">("best");
  const config = useMemo(() => DEFAULT_CONFIG, []);
  const { state, selectedPrice, loadBestPrice } = useBestPrice(config);

  return (
    <main className="panel-shell">
      <div className="tray-arrow" />
      <section className="panel-surface">
        <aside className="side-nav">
          <button
            type="button"
            className={`nav-btn ${activeView === "best" ? "active" : ""}`}
            aria-label="Best prices"
            onClick={() => setActiveView("best")}
          >
            <FuelIcon />
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
                <div className="fuel-pill">{config.fuelType}</div>
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
              <SettingsView config={config} />
            )}
          </section>

          <footer className="panel-footer">Tanky 0.1.0</footer>
        </section>
      </section>
    </main>
  );
}
