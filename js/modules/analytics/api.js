import { getSupabaseClient } from "../../core/supabase-client.js";

export async function insertVisit(payload) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from("visitas").insert(payload);
}

export async function insertEvent(payload) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.from("eventos").insert(payload);
}
