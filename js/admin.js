import { requireAdmin } from "./modules/auth/service.js";
import { initAdminAuthControls } from "./modules/auth/ui/admin.js";
import { initDashboardAdminUI, openDashboardAdmin } from "./modules/dashboard/ui/admin.js";
import { initProductsAdminUI, openProductsAdmin } from "./modules/products/ui/admin.js";
import { initCategoriesAdminUI, openCategoriesAdmin } from "./modules/categories/ui/admin.js";

const DASHBOARD_ENABLED = false;

const refs = {
  dashboardBtn: document.getElementById("goDashboardBtn"),
  productosBtn: document.getElementById("goProductosBtn"),
  categoriasBtn: document.getElementById("goCategoriasBtn"),
  dashboardSection: document.getElementById("dashboardSection"),
  productosSection: document.getElementById("productosSection"),
  categoriasSection: document.getElementById("categoriasSection"),
  refreshBtn: document.getElementById("refreshDashboardBtn")
};

const state = {
  dashboardReady: false,
  productosReady: false,
  categoriasReady: false
};

function revealAdminPage() {
  document.documentElement.classList.remove("admin-auth-pending");
}

function setNavState(activeSection) {
  const isDashboard = activeSection === "dashboard";
  const isProductos = activeSection === "productos";
  const isCategorias = activeSection === "categorias";
  if (refs.dashboardBtn) {
    refs.dashboardBtn.classList.toggle("btn-brand", isDashboard);
    refs.dashboardBtn.classList.toggle("btn-outline-brand", !isDashboard);
    refs.dashboardBtn.setAttribute("aria-selected", String(isDashboard));
  }

  refs.productosBtn.classList.toggle("btn-brand", isProductos);
  refs.productosBtn.classList.toggle("btn-outline-brand", !isProductos);
  refs.productosBtn.setAttribute("aria-selected", String(isProductos));

  refs.categoriasBtn.classList.toggle("btn-brand", isCategorias);
  refs.categoriasBtn.classList.toggle("btn-outline-brand", !isCategorias);
  refs.categoriasBtn.setAttribute("aria-selected", String(isCategorias));
}

function showSection(sectionName) {
  const showDashboard = DASHBOARD_ENABLED && sectionName === "dashboard";
  const showCategorias = sectionName === "categorias";
  const showProductos = !showDashboard && !showCategorias;
  refs.dashboardSection.classList.toggle("d-none", !showDashboard);
  refs.productosSection.classList.toggle("d-none", !showProductos);
  refs.categoriasSection.classList.toggle("d-none", !showCategorias);
  setNavState(showDashboard ? "dashboard" : showCategorias ? "categorias" : "productos");
}

async function openDashboard() {
  if (!DASHBOARD_ENABLED) {
    await openProductos();
    return;
  }

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

async function openCategorias() {
  showSection("categorias");
  if (!state.categoriasReady) {
    state.categoriasReady = initCategoriesAdminUI();
  }

  if (state.categoriasReady) {
    await openCategoriesAdmin();
  }
}

function bindEvents() {
  if (DASHBOARD_ENABLED && refs.dashboardBtn) {
    refs.dashboardBtn.addEventListener("click", () => {
      openDashboard().catch((error) => {
        console.error("Error al abrir dashboard:", error);
      });
    });
  }

  refs.productosBtn.addEventListener("click", () => {
    openProductos().catch((error) => {
      console.error("Error al abrir productos:", error);
    });
  });

  refs.categoriasBtn.addEventListener("click", () => {
    openCategorias().catch((error) => {
      console.error("Error al abrir categorias:", error);
    });
  });

  if (refs.refreshBtn) {
    refs.refreshBtn.classList.toggle("d-none", !DASHBOARD_ENABLED);

    if (DASHBOARD_ENABLED) {
      refs.refreshBtn.addEventListener("click", () => {
        openDashboard().catch((error) => {
          console.error("Error al refrescar dashboard:", error);
        });
      });
    }
  }

  if (refs.dashboardBtn) {
    refs.dashboardBtn.classList.toggle("d-none", !DASHBOARD_ENABLED);
  }
}

async function init() {
  if (
    !refs.dashboardBtn ||
    !refs.productosBtn ||
    !refs.categoriasBtn ||
    !refs.dashboardSection ||
    !refs.productosSection ||
    !refs.categoriasSection
  ) {
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
  await openProductos();
}

init().catch((error) => {
  console.error("Error inicializando panel admin:", error);
  revealAdminPage();
});
