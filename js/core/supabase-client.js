import { loadAppConfig } from "./config.js";

let cachedClient = null;

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
    console.error(configResult.error);
    return null;
  }

  const sdk = globalThis.supabase;
  if (!sdk || typeof sdk.createClient !== "function") {
    console.error("Supabase SDK no se cargo correctamente.");
    return null;
  }

  const config = configResult.data;
  if (!config.url || !config.anonKey) {
    console.error("La configuracion publica de Supabase esta incompleta.");
    return null;
  }

  if (isUnsafeKey(config.anonKey)) {
    console.error("La clave configurada parece secreta. Usa una publishable key o anon key publica.");
    return null;
  }

  cachedClient = sdk.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
}
