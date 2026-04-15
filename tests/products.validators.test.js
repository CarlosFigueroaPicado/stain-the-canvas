import { describe, it, expect } from "vitest";
import { validateProduct } from "../src/modules/products/products.validators.js";

describe("products.validators", () => {
  it("nombre invalido (muy corto)", () => {
    const result = validateProduct({
      nombre: "ab",
      categoria: "Bisuteria",
      descripcion: "Descripcion valida del producto",
      precio: 50
    });

    expect(result).toEqual(
      expect.objectContaining({ success: false })
    );
  });

  it("precio negativo", () => {
    const result = validateProduct({
      nombre: "Producto Test",
      categoria: "Bisuteria",
      descripcion: "Descripcion valida del producto",
      precio: -1
    });

    expect(result).toEqual(
      expect.objectContaining({ success: false })
    );
  });

  it("producto valido", () => {
    const result = validateProduct({
      nombre: "Pulsera artesanal",
      categoria: "Bisuteria",
      descripcion: "Pulsera hecha a mano con materiales de calidad.",
      precio: 120
    });

    expect(result).toEqual(
      expect.objectContaining({ success: true })
    );
  });
});
