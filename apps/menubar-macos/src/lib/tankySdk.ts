import { invoke, isTauri } from "@tauri-apps/api/core";
import { createTankySdk, type SpainFuelApiClient, type TankySdk } from "@tanky/sdk";

interface DatasetResponse {
  Fecha: string;
  ListaEESSPrecio: unknown[];
  Nota: string;
  ResultadoConsulta: string;
}

class TauriSpainFuelApiClient implements SpainFuelApiClient {
  async getStations(): Promise<DatasetResponse> {
    return invoke<DatasetResponse>("fetch_spain_fuel_dataset");
  }
}

function createMenubarSdk(): TankySdk {
  if (!isTauri()) {
    return createTankySdk();
  }

  return createTankySdk({
    countryClients: {
      ES: new TauriSpainFuelApiClient(),
    },
  });
}

export const tankySdk = createMenubarSdk();
