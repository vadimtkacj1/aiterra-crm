import { chartPalette } from "@/styles/designSystem";

/** Distinct series colors aligned to the AITERRA design system. */
export function usePlotPalette(): string[] {
  return [...chartPalette];
}

export const chartLegendStyle = { fontSize: 12 };
export const chartAxisLabelStyle = { fontSize: 11, fillOpacity: 0.75 };
