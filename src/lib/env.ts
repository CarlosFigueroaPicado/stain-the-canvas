type SupabaseConfig = {
  url: string;
  anonKey: string;
  bucket: string;
  productsTable: string;
  whatsappNumber: string;
};

function readRequiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa el archivo .env.`);
  }

  return String(value).trim();
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: readRequiredEnv('PUBLIC_SUPABASE_URL'),
    anonKey: readRequiredEnv('PUBLIC_SUPABASE_ANON_KEY'),
    bucket: import.meta.env.PUBLIC_SUPABASE_BUCKET?.trim() || 'productos',
    productsTable: import.meta.env.PUBLIC_PRODUCTS_TABLE?.trim() || 'productos',
    whatsappNumber: import.meta.env.PUBLIC_WHATSAPP_NUMBER?.trim() || ''
  };
}
