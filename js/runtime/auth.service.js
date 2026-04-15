(function authService() {
  const api = window.stcApis && window.stcApis.auth;
  const TOKEN_KEY = "stc_admin_authenticated";

  function ok(data) {
    return { success: true, data: data == null ? null : data };
  }

  function fail(message) {
    return { success: false, error: String(message || "Operacion no completada.") };
  }

  async function hasAdminAccess(user, client) {
    const appMeta = user && user.app_metadata ? user.app_metadata : {};
    const role = String(appMeta.role || "").toLowerCase();
    const isAdmin = appMeta.is_admin === true || String(appMeta.is_admin || "").toLowerCase() === "true";
    if (role === "admin" || isAdmin) {
      return true;
    }

    if (!api || !user || !user.id) {
      return false;
    }

    try {
      const membershipResult = await api.getAdminMembership(user.id);

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
    try {
      const params = new URLSearchParams(window.location.search || "");
      const requested = params.get("redirect");
      const safeTarget = sanitizeRedirect(requested);
      return ok(safeTarget || defaultTarget || "admin.html");
    } catch (_) {
      return fail("No se pudo resolver la redireccion.");
    }
  }

  async function isAuthenticated() {
    try {
      if (localStorage.getItem(TOKEN_KEY) !== "1") {
        return ok(false);
      }

      if (!api) {
        localStorage.removeItem(TOKEN_KEY);
        return fail("No se pudo conectar con Supabase.");
      }

      const result = await api.getSession();
      const session = result && result.data ? result.data.session : null;
      if (!session) {
        localStorage.removeItem(TOKEN_KEY);
        return ok(false);
      }

      const userResult = await api.getUser();
      const user = userResult && userResult.data ? userResult.data.user : null;
      if (!user || !(await hasAdminAccess(user, api))) {
        localStorage.removeItem(TOKEN_KEY);
        return ok(false);
      }

      return ok(true);
    } catch (error) {
      console.error("No se pudo validar la sesion de admin:", error);
      localStorage.removeItem(TOKEN_KEY);
      return fail("No se pudo validar la sesion de administrador.");
    }
  }

  async function login(username, password) {
    try {
      const email = String(username || "").trim().toLowerCase();
      const pass = String(password || "");
      const client = api;

      if (!email || !pass) {
        return fail("Completa correo y contrasena.");
      }

      if (!client) {
        return fail("No se pudo conectar con Supabase.");
      }

      const result = await client.signInWithPassword(email, pass);

      if (result.error) {
        console.error("Error en signInWithPassword:", result.error);
        return fail(result.error.message || "No se pudo iniciar sesion.");
      }

      const user = result && result.data ? result.data.user : null;
      if (!user || !(await hasAdminAccess(user, client))) {
        await client.signOut();
        localStorage.removeItem(TOKEN_KEY);
        return fail("Tu usuario no tiene permisos de administrador.");
      }

      localStorage.setItem(TOKEN_KEY, "1");
      return ok({ authenticated: true });
    } catch (error) {
      console.error("Error inesperado en login:", error);
      return fail("No se pudo iniciar sesion.");
    }
  }

  async function logout() {
    try {
      const client = api;
      if (client) {
        await client.signOut();
      }
      localStorage.removeItem(TOKEN_KEY);
      return ok({ signedOut: true });
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
      localStorage.removeItem(TOKEN_KEY);
      return fail("No se pudo cerrar sesion correctamente.");
    }
  }

  async function changePassword(newPassword) {
    try {
      const client = api;
      const password = String(newPassword || "");

      if (!client) {
        return fail("No se pudo conectar con Supabase.");
      }

      if (password.length < 8) {
        return fail("La nueva contrasena debe tener al menos 8 caracteres.");
      }

      const result = await client.updatePassword(password);
      if (result.error) {
        return fail(result.error.message || "No se pudo actualizar la contrasena.");
      }

      return ok({ passwordUpdated: true });
    } catch (error) {
      console.error("Error inesperado al cambiar contrasena:", error);
      return fail("No se pudo actualizar la contrasena.");
    }
  }

  async function requireAdmin() {
    try {
      const authResult = await isAuthenticated();
      if (authResult.success && authResult.data === true) {
        return ok(true);
      }

      const currentPage = (window.location.pathname.split("/").pop() || "admin.html").trim();
      const safeCurrent = sanitizeRedirect(currentPage);
      window.location.replace(`login.html?redirect=${encodeURIComponent(safeCurrent)}`);
      return ok(false);
    } catch (error) {
      console.error("Error en requireAdmin:", error);
      return fail("No se pudo validar acceso de administrador.");
    }
  }

  const service = Object.freeze({
    getRedirectTarget,
    isAuthenticated,
    login,
    logout,
    changePassword,
    requireAdmin
  });

  window.stcServices = window.stcServices || {};
  window.stcServices.auth = service;
  window.adminAuth = service;
})();
