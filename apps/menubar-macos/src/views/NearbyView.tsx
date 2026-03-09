import type { StationSort } from "@tanky/core";
import type { FuelType, GasStation } from "@tanky/types";

type NearbyViewProps = {
  state:
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; stations: GasStation[] };
  fuelType: FuelType;
  sort: StationSort;
  onSortChange: (sort: StationSort) => void;
};

export function NearbyView({
  state,
  fuelType,
  sort,
  onSortChange,
}: NearbyViewProps) {
  if (state.status === "loading") {
    return <p className="state-text">Loading nearby stations...</p>;
  }

  if (state.status === "error") {
    return (
      <div className="state-block error">
        <p>Could not load nearby stations.</p>
        <small>{state.message}</small>
      </div>
    );
  }

  if (state.stations.length === 0) {
    return <p className="state-text">No stations found in this radius.</p>;
  }

  return (
    <div className="nearby-section">
      <div className="nearby-toolbar">
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
    </div>
  );
}
