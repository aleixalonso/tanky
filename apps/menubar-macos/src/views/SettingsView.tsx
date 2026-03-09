import { useEffect, useMemo, useState } from "react";
import type { FuelLookupConfig } from "../config/defaultConfig";
import { FUEL_LABELS, FUEL_OPTIONS } from "../config/defaultConfig";

type SettingsViewProps = {
  config: FuelLookupConfig;
  onSave: (config: FuelLookupConfig) => void;
};

type FormState = {
  lat: string;
  lon: string;
  radiusKm: string;
  fuelType: FuelLookupConfig["fuelType"];
};

export function SettingsView({ config, onSave }: SettingsViewProps) {
  const [form, setForm] = useState<FormState>({
    lat: String(config.location.lat),
    lon: String(config.location.lon),
    radiusKm: String(config.radiusKm),
    fuelType: config.fuelType,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    setForm({
      lat: String(config.location.lat),
      lon: String(config.location.lon),
      radiusKm: String(config.radiusKm),
      fuelType: config.fuelType,
    });
    setError(null);
    setSaved(false);
  }, [config]);

  const isDirty = useMemo(
    () =>
      form.lat !== String(config.location.lat) ||
      form.lon !== String(config.location.lon) ||
      form.radiusKm !== String(config.radiusKm) ||
      form.fuelType !== config.fuelType,
    [config, form],
  );

  const onChangeField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSaved(false);
  };

  const onSaveClick = () => {
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    const radiusKm = Number(form.radiusKm);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be a number between -90 and 90.");
      return;
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setError("Longitude must be a number between -180 and 180.");
      return;
    }
    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) {
      setError("Radius must be a number between 0.1 and 50 km.");
      return;
    }

    onSave({
      country: "ES",
      location: { lat, lon },
      fuelType: form.fuelType,
      radiusKm,
    });
    setSaved(true);
  };

  const onResetClick = () => {
    setForm({
      lat: String(config.location.lat),
      lon: String(config.location.lon),
      radiusKm: String(config.radiusKm),
      fuelType: config.fuelType,
    });
    setError(null);
    setSaved(false);
  };

  const onUseCurrentLocationClick = async () => {
    setIsLocating(true);
    setError(null);
    setSaved(false);

    try {
      if (!("geolocation" in navigator)) {
        setError("Geolocation is not available on this device.");
        return;
      }

      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        },
      );

      setForm((prev) => ({
        ...prev,
        lat: position.coords.latitude.toFixed(5),
        lon: position.coords.longitude.toFixed(5),
      }));
    } catch (locationError) {
      if (locationError instanceof GeolocationPositionError) {
        if (locationError.code === locationError.PERMISSION_DENIED) {
          setError("Location permission was not granted.");
          return;
        }

        if (locationError.code === locationError.TIMEOUT) {
          setError("Timed out while determining your current location.");
          return;
        }
      }

      const message =
        locationError instanceof Error
          ? locationError.message
          : "Could not determine your current location.";
      setError(message);
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <article className="settings-card">
      <h2>Fuel Search</h2>

      <div className="settings-grid">
        <label className="field">
          <span>Latitude</span>
          <input
            type="number"
            step="0.0001"
            value={form.lat}
            onChange={(event) => onChangeField("lat", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Longitude</span>
          <input
            type="number"
            step="0.0001"
            value={form.lon}
            onChange={(event) => onChangeField("lon", event.target.value)}
          />
        </label>
      </div>

      <div className="settings-inline-actions">
        <button
          type="button"
          className="settings-btn ghost"
          onClick={() => void onUseCurrentLocationClick()}
          disabled={isLocating}
        >
          {isLocating ? "Locating..." : "Use current location"}
        </button>
      </div>

      <label className="field">
        <span>Fuel Type</span>
        <select
          value={form.fuelType}
          onChange={(event) =>
            onChangeField(
              "fuelType",
              event.target.value as FormState["fuelType"],
            )
          }
        >
          {FUEL_OPTIONS.map((fuelType) => (
            <option key={fuelType} value={fuelType}>
              {FUEL_LABELS[fuelType]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Radius (km)</span>
        <input
          type="number"
          min="0.1"
          max="50"
          step="0.1"
          value={form.radiusKm}
          onChange={(event) => onChangeField("radiusKm", event.target.value)}
        />
      </label>

      {error ? <p className="settings-error">{error}</p> : null}
      {saved ? <p className="settings-saved">Saved.</p> : null}

      <div className="settings-actions">
        <button
          type="button"
          className="settings-btn"
          onClick={onSaveClick}
          disabled={!isDirty}
        >
          Save
        </button>
        <button
          type="button"
          className="settings-btn ghost"
          onClick={onResetClick}
          disabled={!isDirty}
        >
          Reset
        </button>
      </div>
    </article>
  );
}
