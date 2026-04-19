import { loadDashboardMetrics } from "../service.js";
import { formatNumber, formatPercent } from "../../analytics/service.js";
import { escapeHtml } from "../../../shared/product-utils.js";
import * as chartColors from "../../../shared/chart-colors.js";
import { getSupabaseClient } from "../../../core/supabase-client.js";

const refs = {
  section: null,
  status: null,
  updatedAt: null,
  kpiVisitas: null,
  kpiVistas: null,
  kpiClicks: null,
  kpiConversion: null,
  topTableBody: null,
  topWhatsappTableBody: null,
  emptyState: null,
  lineCanvas: null,
  barCanvas: null,
  doughnutCanvas: null
};

const chartState = {
  visitas: null,
  topProductos: null,
  categorias: null
};

let initialized = false;
const liveState = {
  started: false,
  client: null,
  channel: null,
  refreshTimerId: null,
  pollingIntervalId: null,
  isRefreshing: false
};

function showStatus(message, kind) {
  refs.status.className = kind === "danger" ? "alert alert-danger mb-4" : "alert alert-brand-subtle mb-4";
  refs.status.textContent = message;
  refs.status.classList.remove("d-none");
}

function hideStatus() {
  refs.status.classList.add("d-none");
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
  refs.topWhatsappTableBody = document.getElementById("dashboardTopWhatsappBody");
  refs.emptyState = document.getElementById("dashboardEmptyState");
  refs.lineCanvas = document.getElementById("chartVisitas");
  refs.barCanvas = document.getElementById("chartTopProductos");
  refs.doughnutCanvas = document.getElementById("chartCategorias");

  return Object.values(refs).every(Boolean);
}

function getChartPalette() {
  const sequence = chartColors.getSequentialColors(8);
  return {
    line: sequence[0],
    linePoint: sequence[1],
    lineFill: chartColors.withAlpha(sequence[0], 0.24),
    bars: chartColors.withAlpha(sequence.slice(0, 5), 0.86),
    donut: sequence
  };
}

function renderKpis(totals) {
  refs.kpiVisitas.textContent = formatNumber(totals.totalVisitas);
  refs.kpiVistas.textContent = formatNumber(totals.totalVistas);
  refs.kpiClicks.textContent = formatNumber(totals.totalClicks);
  refs.kpiConversion.textContent = formatPercent(totals.conversion);
}

function renderLineChart(series) {
  const palette = getChartPalette();
  chartState.visitas = new globalThis.Chart(refs.lineCanvas, {
    type: "line",
    data: {
      labels: series.map((item) => item.day),
      datasets: [
        {
          label: "Visitas por dia",
          data: series.map((item) => item.total),
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
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderBarChart(topProducts) {
  const topFive = topProducts.slice(0, 5);
  chartState.topProductos = new globalThis.Chart(refs.barCanvas, {
    type: "bar",
    data: {
      labels: topFive.map((item) => item.nombre),
      datasets: [
        {
          label: "Vistas",
          data: topFive.map((item) => item.vistas),
          backgroundColor: getChartPalette().bars,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderDoughnutChart(byCategory) {
  const colors = chartColors.getSequentialColors(Math.max(byCategory.length, 1));
  chartState.categorias = new globalThis.Chart(refs.doughnutCanvas, {
    type: "doughnut",
    data: {
      labels: byCategory.map((item) => item.categoria),
      datasets: [
        {
          data: byCategory.map((item) => item.total),
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
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
          <td>${escapeHtml(item.nombre)}</td>
          <td>${escapeHtml(item.categoria)}</td>
          <td>${formatNumber(item.vistas)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderTopWhatsappTable(rows) {
  if (!rows.length) {
    refs.topWhatsappTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted-brand py-4">No hay clics de WhatsApp todavia.</td>
      </tr>
    `;
    return;
  }

  refs.topWhatsappTableBody.innerHTML = rows
    .slice(0, 10)
    .map((item, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.nombre)}</td>
          <td>${escapeHtml(item.categoria)}</td>
          <td>${formatNumber(item.clicks)}</td>
        </tr>
      `;
    })
    .join("");
}

function toggleEmptyState(shouldShow) {
  refs.emptyState.classList.toggle("d-none", !shouldShow);
}

async function refreshDashboard(options = {}) {
  const config = options && typeof options === "object" ? options : {};
  const silent = config.silent === true;

  if (!silent) {
    showStatus("Cargando metricas del dashboard...", "info");
  }

  try {
    destroyCharts();
    const result = await loadDashboardMetrics(90);
    if (!result.success) {
      showStatus(`Error al cargar dashboard: ${result.error}`, "danger");
      toggleEmptyState(true);
      return;
    }

    const data = result.data;
    renderKpis(data.totals);
    renderLineChart(data.visitSeries);
    renderBarChart(data.topProducts);
    renderDoughnutChart(data.byCategory);
    renderTopTable(data.topProducts);
    renderTopWhatsappTable(data.topWhatsappProducts || []);
    refs.updatedAt.textContent = `Actualizado: ${new Date().toLocaleString("es-NI")}`;
    toggleEmptyState(data.totals.totalVisitas + data.totals.totalVistas + data.totals.totalClicks === 0);
    hideStatus();
  } catch (error) {
    destroyCharts();
    console.error("No se pudo cargar dashboard:", error);
    showStatus(`Error al cargar dashboard: ${error.message || "Error inesperado."}`, "danger");
    toggleEmptyState(true);
  }
}

function scheduleRealtimeRefresh() {
  if (liveState.refreshTimerId) {
    clearTimeout(liveState.refreshTimerId);
  }

  liveState.refreshTimerId = setTimeout(async () => {
    if (liveState.isRefreshing) {
      return;
    }

    liveState.isRefreshing = true;
    try {
      await refreshDashboard({ silent: true });
    } finally {
      liveState.isRefreshing = false;
    }
  }, 450);
}

async function ensureRealtimeDashboard() {
  if (liveState.started) {
    return;
  }

  liveState.started = true;
  liveState.client = await getSupabaseClient();
  if (!liveState.client) {
    return;
  }

  liveState.channel = liveState.client
    .channel("admin-dashboard-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "visitas" }, scheduleRealtimeRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, scheduleRealtimeRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, scheduleRealtimeRefresh)
    .subscribe();

  if (!liveState.pollingIntervalId) {
    liveState.pollingIntervalId = globalThis.setInterval(() => {
      scheduleRealtimeRefresh();
    }, 30000);
  }

  globalThis.addEventListener("focus", scheduleRealtimeRefresh, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleRealtimeRefresh();
    }
  });
}

export function initDashboardAdminUI() {
  if (initialized) {
    return true;
  }

  if (!cacheRefs()) {
    console.error("Dashboard no pudo inicializarse: faltan elementos en admin.html");
    return false;
  }

  initialized = true;
  return true;
}

export async function openDashboardAdmin() {
  if (!initDashboardAdminUI()) {
    return;
  }

  if (!globalThis.Chart) {
    showStatus("No se pudo cargar Chart.js para mostrar graficos.", "danger");
    return;
  }

  await refreshDashboard({ silent: false });
  ensureRealtimeDashboard().catch((error) => {
    console.error("No se pudo inicializar dashboard en tiempo real:", error);
  });
}
