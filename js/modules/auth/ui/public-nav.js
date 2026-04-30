import { logout, resolveCurrentUser } from "../service.js";

async function handleAdminLogout(event) {
  event.preventDefault();

  try {
    await logout();
  } catch (error) {
    console.error("No se pudo cerrar sesión admin desde menú público:", error);
  }

  globalThis.location.assign("index.html");
}

export async function initPublicAdminNav() {
  const adminNavItem = document.getElementById("publicAdminNavItem");
  const logoutNavItem = document.getElementById("publicAdminLogoutItem");
  const logoutButton = document.getElementById("publicAdminLogoutBtn");

  if (!adminNavItem || !logoutNavItem || !logoutButton) {
    return;
  }

  const userResult = await resolveCurrentUser();
  const isAdminSession = Boolean(userResult && userResult.success && userResult.data);

  adminNavItem.classList.toggle("d-none", !isAdminSession);
  logoutNavItem.classList.toggle("d-none", !isAdminSession);

  if (isAdminSession) {
    logoutButton.addEventListener("click", handleAdminLogout);
  }
}
