import { changePassword, logout } from "../service.js";

export function initAdminAuthControls() {
  const logoutBtn = document.getElementById("logoutAdminBtn");
  const formEl = document.getElementById("changePasswordForm");
  const newPasswordEl = document.getElementById("newPassword");
  const confirmPasswordEl = document.getElementById("confirmPassword");
  const statusEl = document.getElementById("changePasswordStatus");
  const saveBtn = document.getElementById("savePasswordBtn");
  const modalEl = document.getElementById("changePasswordModal");

  if (!logoutBtn || !formEl || !newPasswordEl || !confirmPasswordEl || !statusEl || !saveBtn || !modalEl) {
    return;
  }

  const modal = globalThis.bootstrap ? globalThis.bootstrap.Modal.getOrCreateInstance(modalEl) : null;

  function setPasswordStatus(message, kind) {
    statusEl.className = kind === "danger" ? "alert alert-danger" : "alert alert-success";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function clearPasswordForm() {
    formEl.reset();
    statusEl.classList.add("d-none");
    statusEl.textContent = "";
  }

  logoutBtn.addEventListener("click", async () => {
    await logout();
    globalThis.location.replace("login.html");
  });

  modalEl.addEventListener("hidden.bs.modal", clearPasswordForm);

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.classList.add("d-none");

    const password = String(newPasswordEl.value || "");
    const confirm = String(confirmPasswordEl.value || "");

    if (password.length < 8) {
      setPasswordStatus("La nueva contraseña debe tener al menos 8 caracteres.", "danger");
      newPasswordEl.focus();
      return;
    }

    if (password !== confirm) {
      setPasswordStatus("La confirmación no coincide con la nueva contraseña.", "danger");
      confirmPasswordEl.focus();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando...";

    try {
      const result = await changePassword(password);
      if (!result || !result.success) {
        setPasswordStatus((result && result.error) || "No se pudo actualizar la contraseña.", "danger");
        return;
      }

      setPasswordStatus("Contraseña actualizada correctamente.", "success");
      setTimeout(() => {
        if (modal) {
          modal.hide();
        }
      }, 900);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar";
    }
  });
}
