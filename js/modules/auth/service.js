import * as authApi from "./api.js";
import { fail, ok } from "../../core/result.js";
import { getState, setState } from "../../core/store.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const appMeta = user && user.app_metadata ? user.app_metadata : {};
  const role = String(appMeta.role || "").toLowerCase();
  const isAdmin = appMeta.is_admin === true || String(appMeta.is_admin || "").toLowerCase() === "true";

  if (role === "admin" || isAdmin) {
    return true;
  }

  if (!user || !user.id) {
    return false;
  }

  try {
    const membershipResult = await authApi.getAdminMembership(user.id);
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

export function getRedirectTarget(defaultTarget) {
  try {
    const fallbackTarget = sanitizeRedirect(defaultTarget || "admin.html");
    const params = new URLSearchParams(globalThis.location.search || "");
    const requested = params.get("redirect");
    return ok(requested ? sanitizeRedirect(requested) : fallbackTarget);
  } catch {
    return fail("No se pudo resolver la redireccion.");
  }
}

export async function resolveCurrentUser() {
  try {
    const sessionResult = await authApi.getSession();
    if (sessionResult.error) {
      setState({ user: null });
      return fail("No se pudo conectar con Supabase.");
    }

    const sessionUser = getSessionUser(sessionResult);
    if (!sessionUser || !(await hasAdminAccess(sessionUser))) {
      setState({ user: null });
      return ok(null);
    }

    setState({ user: sessionUser });
    return ok(sessionUser);
  } catch (error) {
    console.error("No se pudo resolver la sesion actual:", error);
    setState({ user: null });
    return fail("No se pudo validar la sesion de administrador.");
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
      return fail("Completa correo y contrasena.");
    }

    if (!EMAIL_PATTERN.test(email)) {
      return fail("Ingresa un correo valido.");
    }

    const signInResult = await authApi.signInWithPassword(email, pass);
    if (signInResult.error) {
      console.error("Error en signInWithPassword:", signInResult.error);
      return fail(signInResult.error.message || "No se pudo iniciar sesion.");
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
    return fail("No se pudo iniciar sesion.");
  }
}

export async function logout() {
  try {
    await authApi.signOut();
    setState({ user: null });
    return ok({ signedOut: true });
  } catch (error) {
    console.error("Error al cerrar sesion:", error);
    setState({ user: null });
    return fail("No se pudo cerrar sesion correctamente.");
  }
}

export async function changePassword(newPassword) {
  try {
    const password = String(newPassword || "");
    if (password.length < 8) {
      return fail("La nueva contrasena debe tener al menos 8 caracteres.");
    }

    const result = await authApi.updatePassword(password);
    if (result.error) {
      return fail(result.error.message || "No se pudo actualizar la contrasena.");
    }

    return ok({ passwordUpdated: true });
  } catch (error) {
    console.error("Error inesperado al cambiar contrasena:", error);
    return fail("No se pudo actualizar la contrasena.");
  }
}

export async function requireAdmin(options = {}) {
  const config = options && typeof options === "object" ? options : {};
  const shouldRedirect = config.redirect !== false;

  try {
    const authResult = await isAuthenticated();
    if (authResult.success && authResult.data === true) {
      console.assert(getState().user, "requireAdmin esperaba usuario admin en store");
      return ok(true);
    }

    if (shouldRedirect) {
      const currentPage = sanitizeRedirect(
        (globalThis.location.pathname.split("/").pop() || "admin.html").trim()
      );
      globalThis.location.replace(`login.html?redirect=${encodeURIComponent(currentPage)}`);
    }

    return ok(false);
  } catch (error) {
    console.error("Error en requireAdmin:", error);
    return fail("No se pudo validar acceso de administrador.");
  }
}
