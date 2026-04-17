import { fail, ok } from "./result.js";

const DEFAULT_CONFIG = Object.freeze({
  bucket: "productos",
  productsTable: "productos",
  whatsappNumber: "50589187562"
});

let cachedConfig = null;
let loadingPromise = null;

function normalizeConfig(source) {
  const input = source && typeof source === "object" ? source : {};
  const url = String(input.url || input.supabaseUrl || "").trim();
  const anonKey = String(
    input.anonKey || input.publishableKey || input.supabaseAnonKey || input.supabasePublishableKey || ""
  ).trim();

  return Object.freeze({
    url,
    anonKey,
    bucket: String(input.bucket || DEFAULT_CONFIG.bucket).trim() || DEFAULT_CONFIG.bucket,
    productsTable:
      String(input.productsTable || DEFAULT_CONFIG.productsTable).trim() || DEFAULT_CONFIG.productsTable,
    whatsappNumber:
      String(input.whatsappNumber || DEFAULT_CONFIG.whatsappNumber).trim() || DEFAULT_CONFIG.whatsappNumber
  });
}

async function fetchRemoteConfig() {
  const response = await fetch("/api/config", {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`config_http_${response.status}`);
  }

  return response.json();
}

export function getAppConfigSync() {
  if (cachedConfig) {
    return cachedConfig;
  }

  return normalizeConfig(globalThis.__STC_CONFIG__ || DEFAULT_CONFIG);
}

export async function loadAppConfig() {
  if (cachedConfig) {
    return ok(cachedConfig);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const fromWindow = normalizeConfig(globalThis.__STC_CONFIG__ || {});
    if (fromWindow.url && fromWindow.anonKey) {
      cachedConfig = fromWindow;
      return ok(cachedConfig);
    }

    try {
      const remote = normalizeConfig(await fetchRemoteConfig());
      if (remote.url && remote.anonKey) {
        cachedConfig = remote;
        globalThis.__STC_CONFIG__ = remote;
        return ok(cachedConfig);
      }
    } catch (error) {
      console.warn("No se pudo cargar /api/config:", error);
    }

    const fallback = normalizeConfig(globalThis.__STC_CONFIG__ || {});
    if (fallback.url && fallback.anonKey) {
      cachedConfig = fallback;
      return ok(cachedConfig);
    }

    return fail(
      "No se encontro configuracion publica de Supabase. Define variables de entorno en Vercel o window.__STC_CONFIG__."
    );
  })().finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}
