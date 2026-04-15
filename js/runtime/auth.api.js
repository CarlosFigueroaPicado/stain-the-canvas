(function authApi() {
  function getClient() {
    return window.getSupabaseClient && typeof window.getSupabaseClient === "function"
      ? window.getSupabaseClient()
      : null;
  }

  async function getSession() {
    const client = getClient();
    if (!client) {
      return { data: { session: null }, error: { message: "no_client" } };
    }

    return client.auth.getSession();
  }

  async function getUser() {
    const client = getClient();
    if (!client) {
      return { data: { user: null }, error: { message: "no_client" } };
    }

    return client.auth.getUser();
  }

  async function signInWithPassword(email, password) {
    const client = getClient();
    if (!client) {
      return { data: { user: null }, error: { message: "no_client" } };
    }

    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    const client = getClient();
    if (!client) {
      return { error: null };
    }

    return client.auth.signOut();
  }

  async function updatePassword(password) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.auth.updateUser({ password });
  }

  async function getAdminMembership(userId) {
    const client = getClient();
    if (!client) {
      return { data: null, error: { message: "no_client" } };
    }

    return client
      .from("admin_users")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
  }

  window.stcApis = window.stcApis || {};
  window.stcApis.auth = Object.freeze({
    getSession,
    getUser,
    signInWithPassword,
    signOut,
    updatePassword,
    getAdminMembership
  });
})();
