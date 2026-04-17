function readEnv(...names) {
  for (let index = 0; index < names.length; index += 1) {
    const value = process.env[names[index]];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function GET() {
  const config = {
    url: readEnv("STC_SUPABASE_URL", "VITE_SUPABASE_URL"),
    anonKey: readEnv(
      "STC_SUPABASE_PUBLISHABLE_KEY",
      "STC_SUPABASE_ANON_KEY",
      "VITE_SUPABASE_ANON_KEY"
    ),
    bucket: readEnv("STC_SUPABASE_BUCKET", "VITE_SUPABASE_BUCKET") || "productos",
    productsTable: readEnv("STC_PRODUCTS_TABLE", "VITE_PRODUCTS_TABLE") || "productos",
    whatsappNumber: readEnv("STC_WHATSAPP_NUMBER", "VITE_WHATSAPP_NUMBER") || "50589187562"
  };

  if (!config.url || !config.anonKey) {
    return json(
      {
        error: "missing_public_supabase_config",
        message: "Define STC_SUPABASE_URL y STC_SUPABASE_PUBLISHABLE_KEY en el entorno."
      },
      500
    );
  }

  return json(config, 200);
}
