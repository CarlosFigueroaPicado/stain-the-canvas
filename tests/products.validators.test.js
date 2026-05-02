import { describe, expect, it } from "vitest";
import { validateProductInput } from "../js/shared/product-utils.js";

describe("products.validators", () => {
  it("nombre inválido (muy corto)", () => {
    const result = validateProductInput({
      nombre: "ab",
      categoria: "Bisutería",
      descripcion: "Descripción válida del producto",
      precio: 50
    });

    expect(result).toBe("El nombre debe tener al menos 3 caracteres.");
  });

  it("precio negativo", () => {
    const result = validateProductInput({
      nombre: "Producto Test",
      categoria: "Bisutería",
      descripcion: "Descripción válida del producto",
      precio: -1
    });

    expect(result).toBe("El precio debe ser un número mayor o igual a 0.");
  });

  it("imagenUrl inválida", () => {
    const result = validateProductInput({
      nombre: "Producto Test",
      categoria: "Bisutería",
      descripcion: "Descripción válida del producto",
      precio: 90,
      imagenUrl: "ftp://archivo-invalido"
    });

    expect(result).toBe("La URL de imagen debe iniciar con http:// o https://");
  });

  it("featured inválido", () => {
    const result = validateProductInput({
      nombre: "Producto Test",
      categoria: "Bisutería",
      descripcion: "Descripción válida del producto",
      precio: 90,
      featured: "tal vez"
    });

    expect(result).toBe("El campo featured debe ser booleano.");
  });

  it("producto válido", () => {
    const result = validateProductInput({
      nombre: "Pulsera artesanal",
      categoria: "Bisutería",
      descripcion: "Pulsera hecha a mano con materiales de calidad.",
      precio: 120
    });

    expect(result).toBe("");
  });
});
