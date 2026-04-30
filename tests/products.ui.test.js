import { describe, expect, it } from "vitest";
import { shouldUseCarousel } from "../js/modules/products/ui/shared.js";

describe("products.ui", () => {
  it("entrada null -> false", () => {
    expect(shouldUseCarousel(null)).toBe(false);
  });

  it("array vacío -> false", () => {
    expect(shouldUseCarousel([])).toBe(false);
  });

  it("1 imagen -> false", () => {
    expect(shouldUseCarousel(["https://example.com/img1.jpg"])).toBe(false);
  });

  it("2+ imágenes -> true", () => {
    expect(
      shouldUseCarousel([
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg"
      ])
    ).toBe(true);
  });

  it("valores vacíos no cuentan como imágenes", () => {
    expect(shouldUseCarousel(["", "   ", null])).toBe(false);
  });
});
