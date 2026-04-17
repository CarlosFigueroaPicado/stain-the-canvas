import { describe, expect, it } from "vitest";
import * as chartColors from "../js/shared/chart-colors.js";

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
