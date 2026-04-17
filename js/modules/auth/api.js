import { getSupabaseClient } from "../../core/supabase-client.js";

export async function getSession() {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: { session: null }, error: { message: "no_client" } };
  }

  return client.auth.getSession();
}

export async function signInWithPassword(email, password) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: { user: null }, error: { message: "no_client" } };
  }

  return client.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: null };
  }

  return client.auth.signOut();
}

export async function updatePassword(password) {
  const client = await getSupabaseClient();
  if (!client) {
    return { error: { message: "no_client" } };
  }

  return client.auth.updateUser({ password });
}

export async function getAdminMembership(userId) {
  const client = await getSupabaseClient();
  if (!client) {
    return { data: null, error: { message: "no_client" } };
  }

  return client
    .from("admin_users")
    .select("id,is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
}
