import { describe, it, expect, vi } from "vitest";
import { createProduct } from "../src/modules/products/products.service.js";

describe("products.service", () => {
  it("rechaza producto invalido", async () => {
    const result = await createProduct({
      nombre: "ab",
      categoria: "Bisuteria",
      descripcion: "Descripcion valida del producto",
      precio: 100
    });

    expect(result.success).toBe(false);
  });

  it("devuelve objeto { success: false }", async () => {
    const result = await createProduct({
      nombre: "Producto",
      categoria: "Bisuteria",
      descripcion: "Descripcion valida del producto",
      precio: -20
    });

    expect(result).toEqual(
      expect.objectContaining({ success: false })
    );
  });

  it("crea producto valido con repository mock y devuelve success true", async () => {
    const repository = {
      create: vi.fn(async (payload) => ({ id: "mock-1", ...payload }))
    };

    const result = await createProduct(
      {
        nombre: "Producto Mock",
        categoria: "Bisuteria",
        descripcion: "Descripcion valida para prueba de servicio mock.",
        precio: 200
      },
      { repository }
    );

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({ success: true })
    );
    expect(result.data).toEqual(
      expect.objectContaining({ id: "mock-1", nombre: "Producto Mock" })
    );
  });
});
