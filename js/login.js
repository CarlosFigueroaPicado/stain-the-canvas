(function adminLoginPage() {
  const shellEl = document.getElementById("loginShell");
  const curtainEl = document.getElementById("loginCurtain");
  const formEl = document.getElementById("adminLoginForm");
  const statusEl = document.getElementById("loginStatus");
  const userEl = document.getElementById("loginUser");
  const passEl = document.getElementById("loginPassword");

  if (!shellEl || !curtainEl || !formEl || !statusEl || !userEl || !passEl || !window.adminAuth) {
    return;
  }

  const redirectResult = window.adminAuth.getRedirectTarget("admin.html");
  const redirectTarget =
    redirectResult && redirectResult.success && redirectResult.data
      ? redirectResult.data
      : "admin.html";

  function showStatus(message, kind) {
    statusEl.className = kind === "danger" ? "alert alert-danger mt-3" : "alert alert-success mt-3";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function isValidEmail(value) {
    // Validacion simple para evitar llamadas innecesarias a Auth con entradas vacias o mal formadas.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function openCurtain(options) {
    const config = options && typeof options === "object" ? options : {};
    const shouldFocus = config.focus !== false;

    if (shellEl.classList.contains("is-open")) {
      return;
    }

    shellEl.classList.add("is-open");
    curtainEl.setAttribute("aria-expanded", "true");
    if (shouldFocus) {
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
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const openDelay = reducedMotionQuery && reducedMotionQuery.matches ? 0 : 180;

  // Evita que la cortina bloquee el primer intento de login al cargar la pagina.
  setTimeout(() => {
    openCurtain({ focus: false });
  }, openDelay);

  window.adminAuth
    .isAuthenticated()
    .then((result) => {
      if (result && result.success && result.data === true) {
        window.location.replace(redirectTarget);
      }
    })
    .catch((error) => {
      console.error("No se pudo validar sesion inicial de admin:", error);
      // Si falla la validacion de sesion, permitimos login manual.
    });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const user = String(userEl.value || "").trim();
      const pass = String(passEl.value || "");

      if (!isValidEmail(user)) {
        showStatus("Ingresa un correo valido para continuar.", "danger");
        userEl.focus();
        return;
      }

      const result = await window.adminAuth.login(user, pass);

      if (!result || !result.success) {
        showStatus(
          (result && result.error) || "Credenciales incorrectas. Intenta nuevamente.",
          "danger"
        );
        passEl.value = "";
        passEl.focus();
        return;
      }

      showStatus("Acceso concedido. Redirigiendo...", "success");
      window.location.replace(redirectTarget);
    } catch (error) {
      console.error("Error inesperado en login admin:", error);
      showStatus("No se pudo iniciar sesion. Intenta nuevamente.", "danger");
    } finally {
      setLoading(false);
    }
  });
})();
