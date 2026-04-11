(function initAdminAuth() {
  const TOKEN_KEY = "stc_admin_authenticated";

  async function hasAdminAccess(user, client) {
    const appMeta = user && user.app_metadata ? user.app_metadata : {};
    const role = String(appMeta.role || "").toLowerCase();
    const isAdmin = appMeta.is_admin === true || String(appMeta.is_admin || "").toLowerCase() === "true";
    if (role === "admin" || isAdmin) {
      return true;
    }

    if (!client || !user || !user.id) {
      return false;
    }

    try {
      const membershipResult = await client
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (membershipResult.error) {
        console.error("No se pudo validar membresia admin_users:", membershipResult.error);
        return false;
      }

      return Boolean(membershipResult.data);
    } catch (error) {
      console.error("Error consultando admin_users:", error);
      return false;
    }
  }

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

    try {
      const result = await client.auth.getSession();
      const session = result && result.data ? result.data.session : null;
      if (!session) {
        localStorage.removeItem(TOKEN_KEY);
        return false;
      }

      const userResult = await client.auth.getUser();
      const user = userResult && userResult.data ? userResult.data.user : null;
      if (!user || !(await hasAdminAccess(user, client))) {
        localStorage.removeItem(TOKEN_KEY);
        return false;
      }

      return true;
    } catch (error) {
      console.error("No se pudo validar la sesion de admin:", error);
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }
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
      console.error("Error en signInWithPassword:", result.error);
      return {
        ok: false,
        error: result.error.message || "No se pudo iniciar sesion."
      };
    }

    const user = result && result.data ? result.data.user : null;
    if (!user || !(await hasAdminAccess(user, client))) {
      await client.auth.signOut();
      localStorage.removeItem(TOKEN_KEY);
      return {
        ok: false,
        error: "Tu usuario no tiene permisos de administrador."
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

  async function changePassword(newPassword) {
    const client = getSupabaseClientSafe();
    const password = String(newPassword || "");

    if (!client) {
      return {
        ok: false,
        error: "No se pudo conectar con Supabase."
      };
    }

    if (password.length < 8) {
      return {
        ok: false,
        error: "La nueva contrasena debe tener al menos 8 caracteres."
      };
    }

    try {
      const result = await client.auth.updateUser({ password });
      if (result.error) {
        return {
          ok: false,
          error: result.error.message || "No se pudo actualizar la contrasena."
        };
      }

      return { ok: true };
    } catch (error) {
      console.error("Error inesperado al cambiar contrasena:", error);
      return {
        ok: false,
        error: "No se pudo actualizar la contrasena."
      };
    }
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
    changePassword,
    requireAdmin
  });
})();
