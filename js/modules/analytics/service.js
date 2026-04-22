import * as analyticsApi from "./api.js";
import { fail, ok } from "../../core/result.js";

const SESSION_KEY = "stc_session_id";
const ALLOWED_EVENT_TYPES = new Set(["view_producto", "click_whatsapp"]);
let memorySessionId = "";

function readStorage(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    memorySessionId = value;
  }
}

function generateSessionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `stc-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateSessionId() {
  const existing = readStorage(SESSION_KEY) || memorySessionId;
  if (existing) {
    return existing;
  }

  const created = generateSessionId();
  writeStorage(SESSION_KEY, created);
  return created;
}

export function toDayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function groupByDay(rows, fieldName) {
  const source = Array.isArray(rows) ? rows : [];
  const keyName = String(fieldName || "fecha");
  const grouped = new Map();

  source.forEach((row) => {
    const day = toDayKey(row && row[keyName]);
    if (!day) {
      return;
    }

    grouped.set(day, (grouped.get(day) || 0) + 1);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, total]) => ({ day, total }));
}

export function formatNumber(value) {
  const safe = Number(value || 0);
  return new Intl.NumberFormat("es-NI").format(Number.isFinite(safe) ? safe : 0);
}

export function formatPercent(value) {
  const safe = Number(value || 0);
  return `${(Number.isFinite(safe) ? safe : 0).toFixed(1)}%`;
}

function validateTrackEventPayload(payload) {
  const safe = payload && typeof payload === "object" ? payload : {};
  const tipo = String(safe.tipo || "").trim();
  const categoria = String(safe.categoria || "").trim();
  const productId = String(safe.producto_id || "").trim();

  if (!ALLOWED_EVENT_TYPES.has(tipo)) {
    return fail("El evento requiere un tipo valido.");
  }

  if (categoria.length > 80) {
    return fail("La categoria del evento es demasiado larga.");
  }

  if (productId && productId.length > 120) {
    return fail("El identificador del producto es demasiado largo.");
  }

  return ok({
    tipo,
    producto_id: productId || null,
    categoria: categoria || null
  });
}

export async function trackVisit() {
  try {
    const sessionId = getOrCreateSessionId();
    console.assert(sessionId.length >= 16, "trackVisit requiere session_id estable");

    const result = await analyticsApi.insertVisit({
      session_id: sessionId,
      user_agent: String(globalThis.navigator.userAgent || "").slice(0, 500)
    });

    if (result.error) {
      console.error("No se pudo registrar visita:", result.error);
      return fail(result.error.message || "No se pudo registrar visita.");
    }

    return ok({ tracked: true });
  } catch (error) {
    console.error("Error inesperado al registrar visita:", error);
    return fail("No se pudo registrar visita.");
  }
}

export async function trackEvent(payload) {
  try {
    const validation = validateTrackEventPayload(payload);
    if (!validation.success) {
      return validation;
    }

    console.assert(ALLOWED_EVENT_TYPES.has(validation.data.tipo), "trackEvent recibio un tipo no permitido");

    const result = await analyticsApi.insertEvent({
      tipo: validation.data.tipo,
      producto_id: validation.data.producto_id,
      categoria: validation.data.categoria,
      session_id: getOrCreateSessionId()
    });

    if (result.error) {
      console.error("No se pudo registrar evento:", result.error);
      return fail(result.error.message || "No se pudo registrar evento.");
    }

    return ok({ tracked: true });
  } catch (error) {
    console.error("Error inesperado al registrar evento:", error);
    return fail("No se pudo registrar evento.");
  }
}
