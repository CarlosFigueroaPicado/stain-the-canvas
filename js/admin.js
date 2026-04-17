import { requireAdmin } from "./modules/auth/service.js";
import { initAdminAuthControls } from "./modules/auth/ui/admin.js";
import { initDashboardAdminUI, openDashboardAdmin } from "./modules/dashboard/ui/admin.js";
import { initProductsAdminUI, openProductsAdmin } from "./modules/products/ui/admin.js";

const refs = {
  dashboardBtn: document.getElementById("goDashboardBtn"),
  productosBtn: document.getElementById("goProductosBtn"),
  dashboardSection: document.getElementById("dashboardSection"),
  productosSection: document.getElementById("productosSection"),
  refreshBtn: document.getElementById("refreshDashboardBtn")
};

const state = {
  dashboardReady: false,
  productosReady: false
};

function revealAdminPage() {
  document.documentElement.classList.remove("admin-auth-pending");
}

function setNavState(activeSection) {
  const isDashboard = activeSection === "dashboard";
  refs.dashboardBtn.classList.toggle("btn-brand", isDashboard);
  refs.dashboardBtn.classList.toggle("btn-outline-brand", !isDashboard);
  refs.productosBtn.classList.toggle("btn-brand", !isDashboard);
  refs.productosBtn.classList.toggle("btn-outline-brand", isDashboard);
  refs.dashboardBtn.setAttribute("aria-selected", String(isDashboard));
  refs.productosBtn.setAttribute("aria-selected", String(!isDashboard));
}

function showSection(sectionName) {
  const showDashboard = sectionName === "dashboard";
  refs.dashboardSection.classList.toggle("d-none", !showDashboard);
  refs.productosSection.classList.toggle("d-none", showDashboard);
  setNavState(sectionName);
}

async function openDashboard() {
  showSection("dashboard");
  if (!state.dashboardReady) {
    state.dashboardReady = initDashboardAdminUI();
  }

  if (state.dashboardReady) {
    await openDashboardAdmin();
  }
}

async function openProductos() {
  showSection("productos");
  if (!state.productosReady) {
    state.productosReady = initProductsAdminUI();
  }

  if (state.productosReady) {
    await openProductsAdmin();
  }
}

function bindEvents() {
  refs.dashboardBtn.addEventListener("click", () => {
    openDashboard().catch((error) => {
      console.error("Error al abrir dashboard:", error);
    });
  });

  refs.productosBtn.addEventListener("click", () => {
    openProductos().catch((error) => {
      console.error("Error al abrir productos:", error);
    });
  });

  if (refs.refreshBtn) {
    refs.refreshBtn.addEventListener("click", () => {
      openDashboard().catch((error) => {
        console.error("Error al refrescar dashboard:", error);
      });
    });
  }
}

async function init() {
  if (!refs.dashboardBtn || !refs.productosBtn || !refs.dashboardSection || !refs.productosSection) {
    revealAdminPage();
    return;
  }

  const authResult = await requireAdmin({ redirect: true });
  if (!authResult.success || authResult.data !== true) {
    revealAdminPage();
    return;
  }

  revealAdminPage();
  initAdminAuthControls();
  bindEvents();
  await openDashboard();
}

init().catch((error) => {
  console.error("Error inicializando panel admin:", error);
  revealAdminPage();
});
