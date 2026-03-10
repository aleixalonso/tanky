import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  createTankySdk,
  HttpSpainFuelApiClient,
  type TankySdk,
} from "@tanky/sdk";

function createMenubarSdk(): TankySdk {
  if (!isTauri()) {
    return createTankySdk();
  }

  return createTankySdk({
    countryClients: {
      ES: new HttpSpainFuelApiClient(tauriFetch),
    },
  });
}

export const tankySdk = createMenubarSdk();
