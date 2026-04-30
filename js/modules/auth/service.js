import * as authApi from "./api.js";
import { fail, ok } from "../../core/result.js";
import { getState, setState } from "../../core/store.js";
import { getLastSupabaseClientError } from "../../core/supabase-client.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapAuthErrorMessage(errorMessage) {
  const message = String(errorMessage || "").trim().toLowerCase();
  if (message === "no_client" || message === "no client") {
    const detailed = getLastSupabaseClientError();
    return detailed || "No se pudo inicializar la conexión con Supabase. Verifica la configuración pública (URL y anon key).";
  }

  return String(errorMessage || "No se pudo iniciar sesión.");
}

function sanitizeRedirect(value) {
  const raw = String(value || "").trim();
  return /^[a-zA-Z0-9_-]+\.html$/.test(raw) ? raw : "admin.html";
}

function getSessionUser(sessionResult) {
  return sessionResult && sessionResult.data && sessionResult.data.session
    ? sessionResult.data.session.user || null
    : null;
}

async function hasAdminAccess(user) {
  if (!user || !user.id) {
    return false;
  }

  // Prioriza validación en tabla para evitar depender solo de claims potencialmente desactualizados.
  try {
    const membershipResult = await authApi.getAdminMembership(user.id);
    if (!membershipResult.error && membershipResult.data) {
      return true;
    }

    if (membershipResult.error) {
      console.error("No se pudo validar membresía admin_users:", membershipResult.error);
    }
  } catch (error) {
    console.error("Error consultando admin_users:", error);
  }

  const appMeta = user && user.app_metadata ? user.app_metadata : {};
  const role = String(appMeta.role || "").toLowerCase();
  const isAdmin = appMeta.is_admin === true || String(appMeta.is_admin || "").toLowerCase() === "true";

  if (role === "admin" || isAdmin) {
    return true;
  }

  return false;
}

export function getRedirectTarget(defaultTarget) {
  try {
    const fallbackTarget = sanitizeRedirect(defaultTarget || "admin.html");
    const params = new URLSearchParams(globalThis.location.search || "");
    const requested = params.get("redirect");
    return ok(requested ? sanitizeRedirect(requested) : fallbackTarget);
  } catch {
    return fail("No se pudo resolver la redirección.");
  }
}

export async function resolveCurrentUser() {
  try {
    const sessionResult = await authApi.getSession();
    if (sessionResult.error) {
      setState({ user: null });
      return fail("No se pudo conectar con Supabase.");
    }

    // getUser consulta Auth y ayuda a reducir decisiones basadas en datos stale del cliente.
    const userResult = await authApi.getUser();
    const resolvedUser =
      !userResult.error && userResult.data && userResult.data.user
        ? userResult.data.user
        : getSessionUser(sessionResult);

    if (!resolvedUser || !(await hasAdminAccess(resolvedUser))) {
      setState({ user: null });
      return ok(null);
    }

    setState({ user: resolvedUser });
    return ok(resolvedUser);
  } catch (error) {
    console.error("No se pudo resolver la sesión actual:", error);
    setState({ user: null });
    return fail("No se pudo validar la sesión de administrador.");
  }
}

export async function isAuthenticated() {
  const userResult = await resolveCurrentUser();
  if (!userResult.success) {
    return userResult;
  }

  return ok(Boolean(userResult.data));
}

export async function login(username, password) {
  try {
    const email = String(username || "").trim().toLowerCase();
    const pass = String(password || "");

    if (!email || !pass) {
      return fail("Completa correo y contraseña.");
    }

    if (!EMAIL_PATTERN.test(email)) {
      return fail("Ingresa un correo válido.");
    }

    const signInResult = await authApi.signInWithPassword(email, pass);
    if (signInResult.error) {
      console.error("Error en signInWithPassword:", signInResult.error);
      return fail(mapAuthErrorMessage(signInResult.error.message));
    }

    const userResult = await resolveCurrentUser();
    if (!userResult.success) {
      await authApi.signOut();
      return userResult;
    }

    if (!userResult.data) {
      await authApi.signOut();
      setState({ user: null });
      return fail("Tu usuario no tiene permisos de administrador.");
    }

    return ok({ authenticated: true, user: userResult.data });
  } catch (error) {
    console.error("Error inesperado en login:", error);
    return fail("No se pudo iniciar sesión.");
  }
}

export async function logout() {
  try {
    await authApi.signOut();
    setState({ user: null });
    return ok({ signedOut: true });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    setState({ user: null });
    return fail("No se pudo cerrar sesión correctamente.");
  }
}

export async function changePassword(newPassword) {
  try {
    const password = String(newPassword || "");
    if (password.length < 8) {
      return fail("La nueva contraseña debe tener al menos 8 caracteres.");
    }

    const result = await authApi.updatePassword(password);
    if (result.error) {
      return fail(result.error.message || "No se pudo actualizar la contraseña.");
    }

    return ok({ passwordUpdated: true });
  } catch (error) {
    console.error("Error inesperado al cambiar contraseña:", error);
    return fail("No se pudo actualizar la contraseña.");
  }
}

export async function requireAdmin(options = {}) {
  const config = options && typeof options === "object" ? options : {};
  const shouldRedirect = config.redirect !== false;

  function redirectToLogin() {
    const currentPage = sanitizeRedirect(
      (globalThis.location.pathname.split("/").pop() || "admin.html").trim()
    );
    globalThis.location.replace(`login.html?redirect=${encodeURIComponent(currentPage)}`);
  }

  try {
    const authResult = await isAuthenticated();
    if (authResult.success && authResult.data === true) {
      console.assert(getState().user, "requireAdmin esperaba usuario admin en store");
      return ok(true);
    }

    if (shouldRedirect) {
      redirectToLogin();
    }

    return ok(false);
  } catch (error) {
    console.error("Error en requireAdmin:", error);
    if (shouldRedirect) {
      redirectToLogin();
      return ok(false);
    }

    return fail("No se pudo validar acceso de administrador.");
  }
}
