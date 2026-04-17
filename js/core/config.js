import { fail, ok } from "./result.js";

const DEFAULT_CONFIG = Object.freeze({
  url: "https://mmfpivsfjolohoowhgit.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZnBpdnNmam9sb2hvb3doZ2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjQ3MTAsImV4cCI6MjA5MTE0MDcxMH0.7eIIhxG3tfZTGQ2DB8kA-OHl86NYZfQfaV0cGjemu6w",
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
  const endpointCandidates = [
    "/api/config",
    "/api/config/",
    "./api/config",
    "./api/config/"
  ];
  const failures = [];

  for (let index = 0; index < endpointCandidates.length; index += 1) {
    const endpoint = endpointCandidates[index];

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        let details = "";
        try {
          const body = await response.json();
          details = String(body.message || body.error || "").trim();
        } catch {
          try {
            details = String(await response.text()).trim();
          } catch {
            details = "";
          }
        }

        failures.push(`${endpoint}:config_http_${response.status}${details ? `:${details}` : ""}`);
        continue;
      }

      return response.json();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error || "error_desconocido");
      failures.push(`${endpoint}:${reason}`);
    }
  }

  throw new Error(failures.join(" | "));
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

    const fromDefaults = normalizeConfig(DEFAULT_CONFIG);
    if (fromDefaults.url && fromDefaults.anonKey) {
      cachedConfig = fromDefaults;
      return ok(cachedConfig);
    }

    let remoteErrorReason = "";

    try {
      const remote = normalizeConfig(await fetchRemoteConfig());
      if (remote.url && remote.anonKey) {
        cachedConfig = remote;
        globalThis.__STC_CONFIG__ = remote;
        return ok(cachedConfig);
      }
    } catch (error) {
      console.warn("No se pudo cargar /api/config:", error);
      remoteErrorReason = error instanceof Error ? error.message : String(error || "error_desconocido");
    }

    const fallback = normalizeConfig(globalThis.__STC_CONFIG__ || {});
    if (fallback.url && fallback.anonKey) {
      cachedConfig = fallback;
      return ok(cachedConfig);
    }

    return fail(
      remoteErrorReason
        ? `No se pudo cargar /api/config (${remoteErrorReason}) y no hay fallback de configuracion publica.`
        : "No se encontro configuracion publica de Supabase. Define variables en Vercel o window.__STC_CONFIG__."
    );
  })().finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}
