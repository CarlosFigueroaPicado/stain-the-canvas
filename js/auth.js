(function initAdminAuth() {
  const TOKEN_KEY = "stc_admin_authenticated";
  const ADMIN_USER = "admin";
  const ADMIN_PASSWORD = "admin";

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

  function isAuthenticated() {
    return localStorage.getItem(TOKEN_KEY) === "1";
  }

  function login(username, password) {
    const user = String(username || "").trim().toLowerCase();
    const pass = String(password || "");
    const ok = user === ADMIN_USER && pass === ADMIN_PASSWORD;

    if (ok) {
      localStorage.setItem(TOKEN_KEY, "1");
    }

    return ok;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function requireAdmin() {
    if (isAuthenticated()) {
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
