import type { FuelLookupConfig } from "../config/defaultConfig";

type SettingsViewProps = {
  config: FuelLookupConfig;
};

export function SettingsView({ config }: SettingsViewProps) {
  return (
    <article className="settings-card">
      <h2>MVP Configuration</h2>
      <p>
        Location: {config.location.lat}, {config.location.lon}
      </p>
      <p>Fuel: {config.fuelType}</p>
      <p>Radius: {config.radiusKm} km</p>
      <small>More options will be added here.</small>
    </article>
  );
}
