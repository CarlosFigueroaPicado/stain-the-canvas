export interface AppConfig {
  url: string;
  anonKey: string;
  bucket: string;
  productsTable: string;
  whatsappNumber: string;
}

const defaultConfig: AppConfig = {
  url: "https://mmfpivsfjolohoowhgit.supabase.co",
  anonKey: "",
  bucket: "productos",
  productsTable: "productos",
  whatsappNumber: "50589187562"
};

let cachedClient: any = null;

export function getAppConfig(overrides?: Partial<AppConfig>): AppConfig {
  const fromWindow = (globalThis as any).appConfig || {};
  const fromEnv = (globalThis as any).__STC_CONFIG__ || {};
  return {
    ...defaultConfig,
    ...fromEnv,
    ...fromWindow,
    ...(overrides || {})
  };
}

export function getSupabaseClient(config?: Partial<AppConfig>): any {
  if (cachedClient) {
    return cachedClient;
  }

  const resolved = getAppConfig(config);
  const sdk = (globalThis as any).supabase;

  if (!sdk || typeof sdk.createClient !== "function" || !resolved.url || !resolved.anonKey) {
    return null;
  }

  cachedClient = sdk.createClient(resolved.url, resolved.anonKey, {
    auth: { persistSession: true }
  });

  return cachedClient;
}
