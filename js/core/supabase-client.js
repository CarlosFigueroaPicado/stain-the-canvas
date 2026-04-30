import { loadAppConfig } from "./config.js";

let cachedClient = null;
let lastSupabaseClientError = "";

function setClientError(message) {
  lastSupabaseClientError = String(message || "").trim();
}

export function getLastSupabaseClientError() {
  return lastSupabaseClientError;
}

function isUnsafeKey(value) {
  const key = String(value || "").trim();
  return key.startsWith("sb_secret_") || key.includes("service_role");
}

export async function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const configResult = await loadAppConfig();
  if (!configResult.success) {
    setClientError(configResult.error || "No se pudo cargar la configuración pública de Supabase.");
    console.error(lastSupabaseClientError);
    return null;
  }

  const sdk = globalThis.supabase;
  if (!sdk || typeof sdk.createClient !== "function") {
    setClientError("No se pudo cargar el SDK de Supabase desde el CDN. Verifica bloqueo de red/CSP.");
    console.error(lastSupabaseClientError);
    return null;
  }

  const config = configResult.data;
  if (!config.url || !config.anonKey) {
    setClientError("La configuración pública de Supabase está incompleta (falta URL o anon key).");
    console.error(lastSupabaseClientError);
    return null;
  }

  if (isUnsafeKey(config.anonKey)) {
    setClientError("La clave configurada parece secreta. Usa una publishable key o anon key pública.");
    console.error(lastSupabaseClientError);
    return null;
  }

  cachedClient = sdk.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  setClientError("");

  return cachedClient;
}
