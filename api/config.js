function readEnv(...names) {
  for (let index = 0; index < names.length; index += 1) {
    const value = process && process.env ? process.env[names[index]] : undefined;
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function buildConfig() {
  return {
    url: readEnv(
      "STC_SUPABASE_URL",
      "VITE_SUPABASE_URL",
      "SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "PUBLIC_SUPABASE_URL"
    ),
    anonKey: readEnv(
      "STC_SUPABASE_PUBLISHABLE_KEY",
      "STC_SUPABASE_ANON_KEY",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "PUBLIC_SUPABASE_ANON_KEY"
    ),
    bucket:
      readEnv("STC_SUPABASE_BUCKET", "VITE_SUPABASE_BUCKET", "SUPABASE_BUCKET", "PUBLIC_SUPABASE_BUCKET") ||
      "productos",
    productsTable:
      readEnv("STC_PRODUCTS_TABLE", "VITE_PRODUCTS_TABLE", "PRODUCTS_TABLE", "PUBLIC_PRODUCTS_TABLE") ||
      "productos",
    whatsappNumber:
      readEnv("STC_WHATSAPP_NUMBER", "VITE_WHATSAPP_NUMBER", "WHATSAPP_NUMBER", "PUBLIC_WHATSAPP_NUMBER") ||
      "50589187562"
  };
}

function toWebResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function resolveConfigPayload() {
  const config = buildConfig();

  if (!config.url || !config.anonKey) {
    return {
      status: 500,
      body: {
        error: "missing_public_supabase_config",
        message: "Define STC_SUPABASE_URL y STC_SUPABASE_PUBLISHABLE_KEY en el entorno."
      }
    };
  }

  return {
    status: 200,
    body: config
  };
}

export function GET() {
  const payload = resolveConfigPayload();
  return toWebResponse(payload.body, payload.status);
}

export default function handler(req, res) {
  if (!res || typeof res.status !== "function") {
    const payload = resolveConfigPayload();
    return toWebResponse(payload.body, payload.status);
  }

  if (req && req.method && req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const payload = resolveConfigPayload();
  return res.status(payload.status).json(payload.body);
}
