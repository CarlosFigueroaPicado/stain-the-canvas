import { describe, it, expect } from "vitest";
import "../src/styles/chartColors.js";

const chartColors = globalThis.stcChartColors;

describe("dashboard.colors", () => {
  it("array tiene mas de 3 colores", () => {
    expect(Array.isArray(chartColors.palette)).toBe(true);
    expect(chartColors.palette.length).toBeGreaterThan(3);
  });

  it("todos son strings", () => {
    const allStrings = chartColors.palette.every((item) => typeof item === "string");
    expect(allStrings).toBe(true);
  });

  it("no esta vacio", () => {
    expect(chartColors.palette.length).toBeGreaterThan(0);
  });
});
