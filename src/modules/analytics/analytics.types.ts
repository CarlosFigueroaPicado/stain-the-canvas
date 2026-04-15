export interface AnalyticsEventInput {
  tipo: "view_producto" | "click_whatsapp";
  producto_id?: string | null;
  categoria?: string | null;
}

export interface AnalyticsResult {
  ok: boolean;
  reason?: string;
}
