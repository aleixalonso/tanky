import type { FuelType, GasStation } from "@tanky/types";

type NearbyViewProps = {
  state:
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; stations: GasStation[] };
  fuelType: FuelType;
};

export function NearbyView({ state, fuelType }: NearbyViewProps) {
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
  );
}
