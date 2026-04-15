(function adminOrchestrator() {
  const refs = {
    dashboardBtn: document.getElementById("goDashboardBtn"),
    productosBtn: document.getElementById("goProductosBtn"),
    dashboardSection: document.getElementById("dashboardSection"),
    productosSection: document.getElementById("productosSection"),
    refreshBtn: document.getElementById("refreshDashboardBtn")
  };

  const state = {
    dashboardReady: false,
    productosReady: false,
    currentSection: "dashboard"
  };

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
    state.currentSection = sectionName;
  }

  async function openDashboard() {
    showSection("dashboard");

    if (!window.dashboardModule) {
      console.error("dashboardModule no esta disponible.");
      return;
    }

    if (!state.dashboardReady) {
      const initResult = window.dashboardModule.initDashboard();
      state.dashboardReady = Boolean(initResult && initResult.success && initResult.data === true);
    }

    if (state.dashboardReady) {
      const loadResult = await window.dashboardModule.cargarDashboard();
      if (!loadResult || !loadResult.success) {
        console.error((loadResult && loadResult.error) || "No se pudo cargar dashboard.");
      }
    }
  }

  async function openProductos() {
    showSection("productos");

    if (!window.productosModule) {
      console.error("productosModule no esta disponible.");
      return;
    }

    if (!state.productosReady) {
      const ok = window.productosModule.initProductos();
      state.productosReady = Boolean(ok);
    }

    if (state.productosReady) {
      await window.productosModule.cargarProductos();
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

  function init() {
    if (
      !refs.dashboardBtn ||
      !refs.productosBtn ||
      !refs.dashboardSection ||
      !refs.productosSection
    ) {
      return;
    }

    bindEvents();
    openDashboard().catch((error) => {
      console.error("Error inicializando panel admin:", error);
    });
  }

  init();
})();