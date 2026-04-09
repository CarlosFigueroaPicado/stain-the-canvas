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

  if (window.adminAuth.isAuthenticated()) {
    window.location.replace(redirectTarget);
    return;
  }

  function showStatus(message, kind) {
    statusEl.className = kind === "danger" ? "alert alert-danger mt-3" : "alert alert-success mt-3";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function openCurtain() {
    shellEl.classList.add("is-open");
    curtainEl.setAttribute("aria-expanded", "true");
    setTimeout(() => {
      userEl.focus();
    }, 220);
  }

  curtainEl.addEventListener("click", openCurtain);

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const user = userEl.value;
    const pass = passEl.value;
    const ok = window.adminAuth.login(user, pass);

    if (!ok) {
      showStatus("Credenciales incorrectas. Intenta nuevamente.", "danger");
      passEl.value = "";
      passEl.focus();
      return;
    }

    showStatus("Acceso concedido. Redirigiendo...", "success");
    window.location.replace(redirectTarget);
  });
})();
