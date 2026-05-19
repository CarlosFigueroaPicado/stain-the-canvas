type SupabaseConfig = {
  url: string;
  anonKey: string;
  bucket: string;
  productsTable: string;
  whatsappNumber: string;
};

function readEnvValue(names: Array<keyof ImportMetaEnv>): string {
  for (const name of names) {
    const value = import.meta.env[name];

    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }

  throw new Error(`Falta la variable de entorno ${names.join(' o ')}. Revisa el archivo .env.`);
}

function readOptionalEnvValue(names: Array<keyof ImportMetaEnv>, fallback: string): string {
  for (const name of names) {
    const value = import.meta.env[name];

    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }

  return fallback;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: readEnvValue(['PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL']),
    anonKey: readEnvValue(['PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']),
    bucket: readOptionalEnvValue(['PUBLIC_SUPABASE_BUCKET', 'VITE_SUPABASE_BUCKET'], 'productos'),
    productsTable: readOptionalEnvValue(['PUBLIC_PRODUCTS_TABLE', 'VITE_PRODUCTS_TABLE'], 'productos'),
    whatsappNumber: readOptionalEnvValue(['PUBLIC_WHATSAPP_NUMBER', 'VITE_WHATSAPP_NUMBER'], '')
  };
}
