import { getRedirectTarget, isAuthenticated, login } from "../service.js";

export function initLoginPage() {
  const shellEl = document.getElementById("loginShell");
  const curtainEl = document.getElementById("loginCurtain");
  const formEl = document.getElementById("adminLoginForm");
  const statusEl = document.getElementById("loginStatus");
  const userEl = document.getElementById("loginUser");
  const passEl = document.getElementById("loginPassword");

  if (!shellEl || !curtainEl || !formEl || !statusEl || !userEl || !passEl) {
    return;
  }

  const redirectResult = getRedirectTarget("admin.html");
  const redirectTarget =
    redirectResult && redirectResult.success && redirectResult.data ? redirectResult.data : "admin.html";

  function showStatus(message, kind) {
    statusEl.className = kind === "danger" ? "alert alert-danger mt-3" : "alert alert-success mt-3";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function openCurtain(options = {}) {
    if (shellEl.classList.contains("is-open")) {
      return;
    }

    shellEl.classList.add("is-open");
    curtainEl.setAttribute("aria-expanded", "true");
    if (options.focus !== false) {
      setTimeout(() => {
        userEl.focus();
      }, 220);
    }
  }

  function setLoading(loading) {
    userEl.disabled = loading;
    passEl.disabled = loading;

    const submitBtn = formEl.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? "Validando..." : "Entrar";
    }
  }

  curtainEl.addEventListener("click", () => {
    openCurtain();
  });

  curtainEl.addEventListener("keydown", (event) => {
    const key = String(event.key || "").toLowerCase();
    if (key === "enter" || key === " ") {
      event.preventDefault();
      openCurtain();
    }
  });

  const reducedMotionQuery =
    typeof globalThis.matchMedia === "function"
      ? globalThis.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  setTimeout(() => {
    openCurtain({ focus: false });
  }, reducedMotionQuery && reducedMotionQuery.matches ? 0 : 180);

  isAuthenticated()
    .then((result) => {
      if (result && result.success && result.data === true) {
        globalThis.location.replace(redirectTarget);
      }
    })
    .catch((error) => {
      console.error("No se pudo validar sesion inicial de admin:", error);
    });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await login(userEl.value, passEl.value);
      if (!result || !result.success) {
        showStatus((result && result.error) || "Credenciales incorrectas. Intenta nuevamente.", "danger");
        passEl.value = "";
        passEl.focus();
        return;
      }

      showStatus("Acceso concedido. Redirigiendo...", "success");
      globalThis.location.replace(redirectTarget);
    } catch (error) {
      console.error("Error inesperado en login admin:", error);
      showStatus("No se pudo iniciar sesion. Intenta nuevamente.", "danger");
    } finally {
      setLoading(false);
    }
  });
}
