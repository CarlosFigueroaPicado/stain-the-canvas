export function validateProduct(product) {
  const input = product && typeof product === "object" ? product : {};
  const nombre = String(input.nombre || "").trim();
  const categoria = String(input.categoria || "").trim();
  const descripcion = String(input.descripcion || "").trim();
  const precio = Number.parseFloat(String(input.precio ?? ""));

  if (nombre.length < 3) {
    return { success: false, error: "El nombre debe tener al menos 3 caracteres." };
  }

  if (!categoria) {
    return { success: false, error: "Selecciona una categoria valida." };
  }

  if (!Number.isFinite(precio) || precio < 0) {
    return { success: false, error: "El precio debe ser un numero mayor o igual a 0." };
  }

  if (descripcion.length < 10) {
    return { success: false, error: "La descripcion debe tener al menos 10 caracteres." };
  }

  return { success: true, data: { ...input, precio } };
}
