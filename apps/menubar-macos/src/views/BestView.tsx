import type { GasStation } from "@tanky/types";

type BestViewProps = {
  state:
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; station: GasStation };
  selectedPrice: { price: number; currency: string } | null;
};

export function BestView({ state, selectedPrice }: BestViewProps) {
  if (state.status === "loading") {
    return <p className="state-text">Loading prices...</p>;
  }

  if (state.status === "error") {
    return (
      <div className="state-block error">
        <p>Could not load fuel prices.</p>
        <small>{state.message}</small>
      </div>
    );
  }

  return (
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
  );
}
