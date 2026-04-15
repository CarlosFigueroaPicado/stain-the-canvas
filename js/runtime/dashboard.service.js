(function dashboardService() {
  function ok(data) {
    return { success: true, data: data == null ? null : data };
  }

  function fail(message) {
    return { success: false, error: String(message || "Operacion no completada.") };
  }

  const chartState = {
    visitas: null,
    topProductos: null,
    categorias: null
  };

  const api = window.stcApis && window.stcApis.dashboard;
  const refs = {
    section: null,
    status: null,
    updatedAt: null,
    kpiVisitas: null,
    kpiVistas: null,
    kpiClicks: null,
    kpiConversion: null,
    topTableBody: null,
    emptyState: null,
    lineCanvas: null,
    barCanvas: null,
    doughnutCanvas: null
  };

  const state = {
    initialized: false
  };

  function getChartPalette() {
    const colors = window.stcChartColors;
    if (!colors) {
      return {
        line: "#C86B4A",
        linePoint: "#A34F33",
        lineFill: "rgba(200,107,74,0.20)",
        bars: ["rgba(200,107,74,0.90)", "rgba(200,107,74,0.78)", "rgba(200,107,74,0.66)", "rgba(200,107,74,0.55)", "rgba(200,107,74,0.44)"],
        donut: ["#C86B4A", "#A34F33", "#D58A6F", "#F0C7B1", "#E5A58A", "#8F6A5A"]
      };
    }

    const sequence = colors.getSequentialColors(8);
    return {
      line: sequence[0],
      linePoint: sequence[1],
      lineFill: colors.withAlpha(sequence[0], 0.24),
      bars: colors.withAlpha(sequence.slice(0, 5), 0.86),
      donut: sequence
    };
  }

  function numberFormat(value) {
    if (window.analyticsModule && typeof window.analyticsModule.formatNumber === "function") {
      return window.analyticsModule.formatNumber(value);
    }

    return new Intl.NumberFormat("es-NI").format(Number(value || 0));
  }

  function percentFormat(value) {
    if (window.analyticsModule && typeof window.analyticsModule.formatPercent === "function") {
      return window.analyticsModule.formatPercent(value);
    }

    const safe = Number(value || 0);
    return `${safe.toFixed(1)}%`;
  }

  function dayKey(value) {
    if (window.analyticsModule && typeof window.analyticsModule.toDayKey === "function") {
      return window.analyticsModule.toDayKey(value);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString().slice(0, 10);
  }

  function showStatus(message, kind) {
    if (!refs.status) {
      return;
    }

    refs.status.className =
      kind === "danger" ? "alert alert-danger mb-4" : "alert alert-brand-subtle mb-4";
    refs.status.textContent = message;
    refs.status.classList.remove("d-none");
  }

  function hideStatus() {
    if (!refs.status) {
      return;
    }

    refs.status.classList.add("d-none");
  }

  function setUpdatedAt() {
    if (!refs.updatedAt) {
      return;
    }

    const now = new Date();
    refs.updatedAt.textContent = `Actualizado: ${now.toLocaleString("es-NI")}`;
  }

  function destroyCharts() {
    Object.keys(chartState).forEach((key) => {
      if (chartState[key]) {
        chartState[key].destroy();
        chartState[key] = null;
      }
    });
  }

  function cacheRefs() {
    refs.section = document.getElementById("dashboardSection");
    refs.status = document.getElementById("dashboardStatus");
    refs.updatedAt = document.getElementById("dashboardUpdatedAt");
    refs.kpiVisitas = document.getElementById("kpiTotalVisitas");
    refs.kpiVistas = document.getElementById("kpiTotalVistas");
    refs.kpiClicks = document.getElementById("kpiTotalClicks");
    refs.kpiConversion = document.getElementById("kpiConversion");
    refs.topTableBody = document.getElementById("dashboardTopProductosBody");
    refs.emptyState = document.getElementById("dashboardEmptyState");
    refs.lineCanvas = document.getElementById("chartVisitas");
    refs.barCanvas = document.getElementById("chartTopProductos");
    refs.doughnutCanvas = document.getElementById("chartCategorias");

    return Boolean(
      refs.section &&
        refs.status &&
        refs.kpiVisitas &&
        refs.kpiVistas &&
        refs.kpiClicks &&
        refs.kpiConversion &&
        refs.topTableBody &&
        refs.lineCanvas &&
        refs.barCanvas &&
        refs.doughnutCanvas
    );
  }

  function renderKpis(totals) {
    refs.kpiVisitas.textContent = numberFormat(totals.totalVisitas);
    refs.kpiVistas.textContent = numberFormat(totals.totalVistas);
    refs.kpiClicks.textContent = numberFormat(totals.totalClicks);
    refs.kpiConversion.textContent = percentFormat(totals.conversion);
  }

  function buildVisitSeries(visitasRows) {
    const grouped =
      window.analyticsModule && typeof window.analyticsModule.groupByDay === "function"
        ? window.analyticsModule.groupByDay(visitasRows, "fecha")
        : [];

    if (grouped.length > 0) {
      return grouped;
    }

    const fallbackMap = new Map();
    (Array.isArray(visitasRows) ? visitasRows : []).forEach((row) => {
      const key = dayKey(row && row.fecha);
      if (!key) {
        return;
      }
      fallbackMap.set(key, (fallbackMap.get(key) || 0) + 1);
    });

    return Array.from(fallbackMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, total]) => ({ day, total }));
  }

  function aggregateTopProducts(viewRows, productMap) {
    const counts = new Map();

    (Array.isArray(viewRows) ? viewRows : []).forEach((row) => {
      const productId = String(row && row.producto_id ? row.producto_id : "").trim();
      if (!productId) {
        return;
      }

      counts.set(productId, (counts.get(productId) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([id, vistas]) => {
        const meta = productMap.get(id) || {};
        return {
          id,
          vistas,
          nombre: meta.nombre || `Producto ${id.slice(0, 8)}`,
          categoria: meta.categoria || "Sin categoria"
        };
      })
      .sort((a, b) => b.vistas - a.vistas);
  }

  function aggregateByCategory(viewRows, productMap) {
    const counts = new Map();

    (Array.isArray(viewRows) ? viewRows : []).forEach((row) => {
      const productId = String(row && row.producto_id ? row.producto_id : "").trim();
      const fallbackCategoria = String(row && row.categoria ? row.categoria : "").trim();
      const byProduct = productMap.get(productId);
      const categoria =
        String((byProduct && byProduct.categoria) || fallbackCategoria || "Sin categoria").trim() ||
        "Sin categoria";

      counts.set(categoria, (counts.get(categoria) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }

  function renderLineChart(series) {
    const labels = series.map((item) => item.day);
    const values = series.map((item) => item.total);

    if (chartState.visitas) {
      chartState.visitas.destroy();
    }

    const palette = getChartPalette();

    chartState.visitas = new window.Chart(refs.lineCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Visitas por dia",
            data: values,
            borderColor: palette.line,
            backgroundColor: palette.lineFill,
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: palette.linePoint
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  function renderBarChart(topProducts) {
    const topFive = topProducts.slice(0, 5);
    const labels = topFive.map((item) => item.nombre);
    const values = topFive.map((item) => item.vistas);

    if (chartState.topProductos) {
      chartState.topProductos.destroy();
    }

    const palette = getChartPalette();

    chartState.topProductos = new window.Chart(refs.barCanvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Vistas",
            data: values,
            backgroundColor: palette.bars,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  function renderDoughnutChart(byCategory) {
    const labels = byCategory.map((item) => item.categoria);
    const values = byCategory.map((item) => item.total);

    if (chartState.categorias) {
      chartState.categorias.destroy();
    }

    const palette = getChartPalette();
    const dynamicSequence =
      window.stcChartColors && typeof window.stcChartColors.getSequentialColors === "function"
        ? window.stcChartColors.getSequentialColors(Math.max(values.length, 1))
        : [];
    const donutColors = dynamicSequence.length > 0
      ? dynamicSequence
      : palette.donut.slice(0, Math.max(values.length, 1));

    chartState.categorias = new window.Chart(refs.doughnutCanvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: donutColors,
            borderColor: "#fff",
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    });
  }

  function renderTopTable(rows) {
    if (!rows.length) {
      refs.topTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted-brand py-4">No hay datos de vistas todavia.</td>
        </tr>
      `;
      return;
    }

    refs.topTableBody.innerHTML = rows
      .slice(0, 10)
      .map((item, index) => {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${window.productUtils.escapeHtml(item.nombre)}</td>
            <td>${window.productUtils.escapeHtml(item.categoria)}</td>
            <td>${numberFormat(item.vistas)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function toggleEmptyState(shouldShow) {
    if (!refs.emptyState) {
      return;
    }

    refs.emptyState.classList.toggle("d-none", !shouldShow);
  }

  async function fetchPagedRows(queryFactory, pageSize) {
    const chunk = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 1000;
    const output = [];
    let from = 0;

    while (true) {
      const to = from + chunk - 1;
      const result = await queryFactory(from, to);

      if (result.error) {
        return fail(result.error.message || "No se pudieron cargar metricas.");
      }

      const rows = Array.isArray(result.data) ? result.data : [];
      output.push(...rows);

      if (rows.length < chunk) {
        break;
      }

      from += chunk;
    }

    return ok(output);
  }

  async function fetchData() {
    if (!api) {
      return fail("No se pudo conectar a Supabase.");
    }

    try {
      const rpcResult = await api.getDashboardMetrics(90);
      if (rpcResult.error) {
        throw rpcResult.error;
      }

      const payload = rpcResult.data && typeof rpcResult.data === "object" ? rpcResult.data : {};
      const totals = payload.totals && typeof payload.totals === "object" ? payload.totals : {};
      const visitSeries = Array.isArray(payload.visitSeries) ? payload.visitSeries : [];
      const topProducts = Array.isArray(payload.topProducts) ? payload.topProducts : [];
      const byCategory = Array.isArray(payload.byCategory) ? payload.byCategory : [];

      return ok({
        totals: {
          totalVisitas: Number(totals.totalVisitas || 0),
          totalVistas: Number(totals.totalVistas || 0),
          totalClicks: Number(totals.totalClicks || 0),
          conversion: Number(totals.conversion || 0)
        },
        visitSeries,
        topProducts,
        byCategory,
        source: "rpc"
      });
    } catch (rpcError) {
      console.warn("RPC get_dashboard_metrics no disponible o fallo, usando modo legado:", rpcError);
    }

    const productsTable = (window.appConfig && window.appConfig.productsTable) || "productos";

    const [
      visitasCountResult,
      vistasCountResult,
      clicksCountResult,
      visitasRowsResult,
      viewRowsResult,
      productsResult
    ] = await Promise.all([
        api.countVisitas(),
        api.countEventByType("view_producto"),
        api.countEventByType("click_whatsapp"),
        fetchPagedRows((from, to) => api.fetchVisitasRange(from, to), 1000),
        fetchPagedRows((from, to) => api.fetchViewsRange(from, to), 1000),
        api.fetchProductsLite(productsTable)
    ]);

    const results = [
      visitasCountResult,
      vistasCountResult,
      clicksCountResult,
      visitasRowsResult,
      viewRowsResult,
      productsResult
    ];

    const failed = results.find((item) => item && (item.error || item.success === false));
    if (failed) {
      if (failed.error && failed.error.message) {
        return fail(failed.error.message);
      }

      return fail(failed.error || "No se pudieron cargar metricas.");
    }

    const totalVisitas = Number(visitasCountResult.count || 0);
    const totalVistas = Number(vistasCountResult.count || 0);
    const totalClicks = Number(clicksCountResult.count || 0);
    const conversion = totalVistas > 0 ? (totalClicks / totalVistas) * 100 : 0;

    const productRows = productsResult.data || [];
    const visitasRows = Array.isArray(visitasRowsResult.data) ? visitasRowsResult.data : [];
    const viewRows = Array.isArray(viewRowsResult.data) ? viewRowsResult.data : [];

    return ok({
      totals: {
        totalVisitas,
        totalVistas,
        totalClicks,
        conversion
      },
      visitasRows,
      viewRows,
      productRows,
      source: "legacy"
    });
  }

  function buildProductMap(productRows) {
    const map = new Map();
    (Array.isArray(productRows) ? productRows : []).forEach((row) => {
      const id = String(row && row.id ? row.id : "").trim();
      if (!id) {
        return;
      }

      map.set(id, {
        nombre: String(row.nombre || "Producto"),
        categoria: String(row.categoria || "Sin categoria")
      });
    });

    return map;
  }

  async function cargarDashboard() {
    try {
      const initResult = state.initialized ? ok(true) : initDashboard();
      if (!initResult.success || initResult.data !== true) {
        return fail((initResult && initResult.error) || "No se pudo inicializar el dashboard.");
      }

      if (!window.Chart) {
        showStatus("No se pudo cargar Chart.js para mostrar graficos.", "danger");
        return fail("No se pudo cargar la libreria de graficos.");
      }

      showStatus("Cargando metricas del dashboard...", "info");

      const dataResult = await fetchData();
      if (!dataResult.success) {
        showStatus(`Error al cargar dashboard: ${dataResult.error}`, "danger");
        toggleEmptyState(true);
        return fail(dataResult.error);
      }

      const data = dataResult.data || {};
      let visitSeries = [];
      let topProducts = [];
      let byCategory = [];

      if (data.source === "rpc") {
        visitSeries = Array.isArray(data.visitSeries) ? data.visitSeries : [];
        topProducts = Array.isArray(data.topProducts) ? data.topProducts : [];
        byCategory = Array.isArray(data.byCategory) ? data.byCategory : [];
      } else {
        const productMap = buildProductMap(data.productRows);
        visitSeries = buildVisitSeries(data.visitasRows);
        topProducts = aggregateTopProducts(data.viewRows, productMap);
        byCategory = aggregateByCategory(data.viewRows, productMap);
      }

      renderKpis(data.totals);

      renderLineChart(visitSeries);
      renderBarChart(topProducts);
      renderDoughnutChart(byCategory);
      renderTopTable(topProducts);

      const hasAnyData = data.totals.totalVisitas > 0 || data.totals.totalVistas > 0 || data.totals.totalClicks > 0;
      toggleEmptyState(!hasAnyData);
      setUpdatedAt();
      hideStatus();
      return ok({ rendered: true });
    } catch (error) {
      destroyCharts();
      console.error("No se pudo cargar dashboard:", error);
      const safeMessage = (error && error.message) || "No se pudieron cargar las metricas.";
      showStatus(`Error al cargar dashboard: ${safeMessage}`, "danger");
      toggleEmptyState(true);
      return fail("No se pudieron cargar las metricas del dashboard.");
    }
  }

  function initDashboard() {
    try {
      if (state.initialized) {
        return ok(true);
      }

      const refsReady = cacheRefs();
      if (!refsReady) {
        console.error("Dashboard no pudo inicializarse: faltan elementos en admin.html");
        return fail("Faltan elementos para inicializar el dashboard.");
      }

      state.initialized = true;
      return ok(true);
    } catch (error) {
      console.error("Error inicializando dashboard:", error);
      return fail("No se pudo inicializar el dashboard.");
    }
  }

  const service = Object.freeze({
    initDashboard,
    cargarDashboard
  });

  window.stcServices = window.stcServices || {};
  window.stcServices.dashboard = service;
  window.dashboardModule = service;
})();
