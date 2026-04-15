import { validateProduct } from "./products.validators.js";

function fail(error) {
  return { success: false, error: String(error || "Operacion no completada.") };
}

function ok(data) {
  return { success: true, data: data == null ? null : data };
}

export async function createProduct(product, options = {}) {
  try {
    const validation = validateProduct(product);
    if (!validation.success) {
      return fail(validation.error || "Producto invalido.");
    }

    const repository = options && typeof options.repository === "object" ? options.repository : null;
    if (!repository || typeof repository.create !== "function") {
      return ok(validation.data);
    }

    const saved = await repository.create(validation.data);
    return ok(saved);
  } catch (error) {
    return fail((error && error.message) || "No se pudo crear el producto.");
  }
}
