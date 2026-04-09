(function initAdminAuth() {
  const TOKEN_KEY = "stc_admin_authenticated";

  function sanitizeRedirect(value) {
    const raw = String(value || "").trim();
    if (/^[a-zA-Z0-9_-]+\.html$/.test(raw)) {
      return raw;
    }
    return "admin.html";
  }

  function getRedirectTarget(defaultTarget) {
    const params = new URLSearchParams(window.location.search || "");
    const requested = params.get("redirect");
    const safeTarget = sanitizeRedirect(requested);
    return safeTarget || defaultTarget || "admin.html";
  }

  function getSupabaseClientSafe() {
    if (!window.getSupabaseClient || typeof window.getSupabaseClient !== "function") {
      return null;
    }
    return window.getSupabaseClient();
  }

  async function isAuthenticated() {
    if (localStorage.getItem(TOKEN_KEY) !== "1") {
      return false;
    }

    const client = getSupabaseClientSafe();
    if (!client) {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }

    const result = await client.auth.getSession();
    const session = result && result.data ? result.data.session : null;
    if (!session) {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }

    return true;
  }

  async function login(username, password) {
    const email = String(username || "").trim().toLowerCase();
    const pass = String(password || "");
    const client = getSupabaseClientSafe();

    if (!email || !pass) {
      return {
        ok: false,
        error: "Completa correo y contrasena."
      };
    }

    if (!client) {
      return {
        ok: false,
        error: "No se pudo conectar con Supabase."
      };
    }

    const result = await client.auth.signInWithPassword({
      email,
      password: pass
    });

    if (result.error) {
      return {
        ok: false,
        error: result.error.message || "No se pudo iniciar sesion."
      };
    }

    localStorage.setItem(TOKEN_KEY, "1");
    return { ok: true };
  }

  async function logout() {
    const client = getSupabaseClientSafe();
    if (client) {
      await client.auth.signOut();
    }
    localStorage.removeItem(TOKEN_KEY);
  }

  async function requireAdmin() {
    const ok = await isAuthenticated();
    if (ok) {
      return true;
    }

    const currentPage = (window.location.pathname.split("/").pop() || "admin.html").trim();
    const safeCurrent = sanitizeRedirect(currentPage);
    window.location.replace(`login.html?redirect=${encodeURIComponent(safeCurrent)}`);
    return false;
  }

  window.adminAuth = Object.freeze({
    getRedirectTarget,
    isAuthenticated,
    login,
    logout,
    requireAdmin
  });
})();
