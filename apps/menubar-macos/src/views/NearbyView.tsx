import type { StationSort } from "@tanky/core";
import type { FuelType, GasStation } from "@tanky/types";
import { RefreshIcon } from "../components/icons";
import { FUEL_LABELS, FUEL_OPTIONS } from "../config/defaultConfig";

type NearbyViewProps = {
  state:
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; stations: GasStation[] };
  fuelType: FuelType;
  sort: StationSort;
  onFuelTypeChange: (fuelType: FuelType) => void;
  onSortChange: (sort: StationSort) => void;
};

export function NearbyView({
  state,
  fuelType,
  sort,
  onFuelTypeChange,
  onSortChange,
}: NearbyViewProps) {
  return (
    <div className="nearby-section">
      <div className="nearby-toolbar">
        <label className="field nearby-fuel-type">
          <span>Fuel Type</span>
          <select
            value={fuelType}
            onChange={(event) =>
              onFuelTypeChange(event.target.value as FuelType)
            }
          >
            {FUEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {FUEL_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="field nearby-sort">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as StationSort)
            }
          >
            <option value="distance">Distance</option>
            <option value="price">Price</option>
          </select>
        </label>
      </div>

      {state.status === "loading" ? (
        <div className="loading-state" aria-label="Loading nearby stations">
          <div className="spinner" aria-hidden="true">
            <RefreshIcon />
          </div>
        </div>
      ) : state.status === "error" ? (
        <div className="state-block error">
          <p>Could not load nearby stations.</p>
          <small>{state.message}</small>
        </div>
      ) : state.stations.length === 0 ? (
        <p className="state-text">No stations found in this radius.</p>
      ) : (
        <div className="nearby-list">
          {state.stations.map((station) => {
            const selectedPrice = station.prices.find(
              (entry) => entry.type === fuelType,
            );

            return (
              <article className="nearby-item" key={station.id}>
                <h3>{station.name}</h3>
                <p className="nearby-price">
                  {selectedPrice
                    ? `${selectedPrice.price.toFixed(3)} ${selectedPrice.currency}`
                    : "-"}
                </p>
                <p className="meta">
                  {station.distanceKm?.toFixed(2) ?? "-"} km away
                </p>
                <p className="address">{station.address}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
