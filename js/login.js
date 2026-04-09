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

  const redirectTarget = window.adminAuth.getRedirectTarget("admin.html");

  function showStatus(message, kind) {
    statusEl.className = kind === "danger" ? "alert alert-danger mt-3" : "alert alert-success mt-3";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function isValidEmail(value) {
    // Validacion simple para evitar llamadas innecesarias a Auth con entradas vacias o mal formadas.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function openCurtain() {
    if (shellEl.classList.contains("is-open")) {
      return;
    }

    shellEl.classList.add("is-open");
    curtainEl.setAttribute("aria-expanded", "true");
    setTimeout(() => {
      userEl.focus();
    }, 220);
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

  curtainEl.addEventListener("click", openCurtain);

  window.adminAuth
    .isAuthenticated()
    .then((ok) => {
      if (ok) {
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

      if (!result || !result.ok) {
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
