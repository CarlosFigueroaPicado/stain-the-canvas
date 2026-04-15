import type { AnalyticsEventInput } from "./analytics.types";

export function isValidAnalyticsType(tipo: string): boolean {
  return tipo === "view_producto" || tipo === "click_whatsapp";
}

export function validateAnalyticsEvent(payload: Partial<AnalyticsEventInput>): string {
  const tipo = String(payload?.tipo || "").trim();
  if (!isValidAnalyticsType(tipo)) {
    return "Tipo de evento no valido.";
  }
  const categoria = String(payload?.categoria || "");
  if (categoria.length > 80) {
    return "Categoria demasiado larga.";
  }
  return "";
}
