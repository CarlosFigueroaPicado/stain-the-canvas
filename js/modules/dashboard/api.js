import { getAppConfigSync } from "../../core/config.js";
import { getSupabaseClient } from "../../core/supabase-client.js";

function getProductsTable() {
  return getAppConfigSync().productsTable || "productos";
}

export async function getDashboardMetrics(days) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: "no_client" } };
  }

  return client.rpc("get_dashboard_metrics", { p_days: days });
}

export async function countVisitas(sinceIso) {
  const client = await getSupabaseClient();
  if (!client) {
    return { count: 0, error: { message: "no_client" } };
  }

  let query = client.from("visitas").select("id", { count: "exact", head: true });
  if (sinceIso) {
    query = query.gte("fecha", sinceIso);
  }

  return query;
}

export async function countEventByType(tipo, sinceIso) {
  const client = await getSupabaseClient();
  if (!client) {
    return { count: 0, error: { message: "no_client" } };
  }

  let query = client.from("eventos").select("id", { count: "exact", head: true }).eq("tipo", tipo);
  if (sinceIso) {
    query = query.gte("fecha", sinceIso);
  }

  return query;
}

export async function fetchVisitasRange(from, to, sinceIso) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  let query = client.from("visitas").select("fecha").order("fecha", { ascending: true });
  if (sinceIso) {
    query = query.gte("fecha", sinceIso);
  }

  return query.range(from, to);
}

export async function fetchViewsRange(from, to, sinceIso) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  let query = client
    .from("eventos")
    .select("producto_id,categoria,fecha")
    .eq("tipo", "view_producto")
    .order("fecha", { ascending: true });

  if (sinceIso) {
    query = query.gte("fecha", sinceIso);
  }

  return query.range(from, to);
}

export async function fetchProductsLite() {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: [], error: { message: "no_client" } };
  }

  return client.from(getProductsTable()).select("id,nombre,categoria");
}
