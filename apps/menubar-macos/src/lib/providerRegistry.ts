import { registerProvider } from "@tanky/core";
import { SpainFuelProvider } from "@tanky/provider-es";

export const spainProvider = new SpainFuelProvider();

registerProvider(spainProvider);
