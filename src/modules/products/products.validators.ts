import type { ProductInput } from "./products.types";

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateProductInput(input: ProductInput): string {
  const nombre = String(input?.nombre || "").trim();
  const categoria = String(input?.categoria || "").trim();
  const descripcion = String(input?.descripcion || "").trim();
  const precio = Number.parseFloat(String(input?.precio ?? "0"));
  const imagenUrl = String(input?.imagenUrl || "").trim();

  if (nombre.length < 3) return "El nombre debe tener al menos 3 caracteres.";
  if (!categoria) return "Selecciona una categoria valida.";
  if (!Number.isFinite(precio) || precio < 0) return "El precio debe ser un numero mayor o igual a 0.";
  if (descripcion.length < 10) return "La descripcion debe tener al menos 10 caracteres.";
  if (imagenUrl && !isHttpUrl(imagenUrl)) return "La URL de imagen debe iniciar con http:// o https://";

  return "";
}
