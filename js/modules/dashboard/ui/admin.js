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
  insightTrafficTitle: null,
  insightTrafficBody: null,
  insightFunnelTitle: null,
  insightFunnelBody: null,
  insightProductsTitle: null,
  insightProductsBody: null,
  insightCategoriesTitle: null,
  insightCategoriesBody: null,
  insightWhatsappTitle: null,
  insightWhatsappBody: null,
  predictionTrafficTitle: null,
  predictionTrafficBody: null,
  predictionTrafficConfidence: null,
  predictionFunnelTitle: null,
  predictionFunnelBody: null,
  predictionFunnelConfidence: null,
  predictionProductsTitle: null,
  predictionProductsBody: null,
  predictionProductsConfidence: null,
  predictionCategoriesTitle: null,
  predictionCategoriesBody: null,
  predictionCategoriesConfidence: null,
  predictionWhatsappTitle: null,
  predictionWhatsappBody: null,
  predictionWhatsappConfidence: null,
  alertsList: null,
  recommendationsList: null,
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
  refs.insightTrafficTitle = document.getElementById("insightTrafficTitle");
  refs.insightTrafficBody = document.getElementById("insightTrafficBody");
  refs.insightFunnelTitle = document.getElementById("insightFunnelTitle");
  refs.insightFunnelBody = document.getElementById("insightFunnelBody");
  refs.insightProductsTitle = document.getElementById("insightProductsTitle");
  refs.insightProductsBody = document.getElementById("insightProductsBody");
  refs.insightCategoriesTitle = document.getElementById("insightCategoriesTitle");
  refs.insightCategoriesBody = document.getElementById("insightCategoriesBody");
  refs.insightWhatsappTitle = document.getElementById("insightWhatsappTitle");
  refs.insightWhatsappBody = document.getElementById("insightWhatsappBody");
  refs.predictionTrafficTitle = document.getElementById("predictionTrafficTitle");
  refs.predictionTrafficBody = document.getElementById("predictionTrafficBody");
  refs.predictionTrafficConfidence = document.getElementById("predictionTrafficConfidence");
  refs.predictionFunnelTitle = document.getElementById("predictionFunnelTitle");
  refs.predictionFunnelBody = document.getElementById("predictionFunnelBody");
  refs.predictionFunnelConfidence = document.getElementById("predictionFunnelConfidence");
  refs.predictionProductsTitle = document.getElementById("predictionProductsTitle");
  refs.predictionProductsBody = document.getElementById("predictionProductsBody");
  refs.predictionProductsConfidence = document.getElementById("predictionProductsConfidence");
  refs.predictionCategoriesTitle = document.getElementById("predictionCategoriesTitle");
  refs.predictionCategoriesBody = document.getElementById("predictionCategoriesBody");
  refs.predictionCategoriesConfidence = document.getElementById("predictionCategoriesConfidence");
  refs.predictionWhatsappTitle = document.getElementById("predictionWhatsappTitle");
  refs.predictionWhatsappBody = document.getElementById("predictionWhatsappBody");
  refs.predictionWhatsappConfidence = document.getElementById("predictionWhatsappConfidence");
  refs.alertsList = document.getElementById("dashboardAlertsList");
  refs.recommendationsList = document.getElementById("dashboardRecommendationsList");
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

function renderInsights(insights) {
  const safe = insights && typeof insights === "object" ? insights : {};
  const traffic = safe.traffic || {};
  const funnel = safe.funnel || {};
  const products = safe.products || {};
  const categories = safe.categories || {};
  const whatsapp = safe.whatsapp || {};

  refs.insightTrafficTitle.textContent = traffic.title || "Trafico estable";
  refs.insightTrafficBody.textContent = traffic.body || "Sin datos suficientes para analisis de trafico.";

  refs.insightFunnelTitle.textContent = funnel.title || "Embudo con oportunidad de mejora";
  refs.insightFunnelBody.textContent = funnel.body || "Sin datos suficientes para analisis de clientes.";

  refs.insightProductsTitle.textContent = products.title || "Producto lider";
  refs.insightProductsBody.textContent = products.body || "Sin datos suficientes para analisis de productos.";

  refs.insightCategoriesTitle.textContent = categories.title || "Categoria lider";
  refs.insightCategoriesBody.textContent = categories.body || "Sin datos suficientes para analisis por categoria.";

  refs.insightWhatsappTitle.textContent = whatsapp.title || "Mayor intencion de compra";
  refs.insightWhatsappBody.textContent = whatsapp.body || "Sin datos suficientes para analisis de WhatsApp.";
}

function applyConfidenceBadge(element, value) {
  const safe = String(value || "baja").toLowerCase();
  const text = safe === "alta" || safe === "media" || safe === "baja" ? safe : "baja";
  element.textContent = text;
  element.className = "badge rounded-pill border border-brand-subtle";

  if (text === "alta") {
    element.classList.add("text-bg-success");
    return;
  }

  if (text === "media") {
    element.classList.add("text-bg-warning");
    return;
  }

  element.classList.add("text-bg-light");
}

function renderPredictions(predictions) {
  const safe = predictions && typeof predictions === "object" ? predictions : {};
  const traffic = safe.traffic || {};
  const funnel = safe.funnel || {};
  const products = safe.products || {};
  const categories = safe.categories || {};
  const whatsapp = safe.whatsapp || {};

  refs.predictionTrafficTitle.textContent = traffic.title || "Prediccion de trafico (7 dias)";
  refs.predictionTrafficBody.textContent = traffic.body || "Sin datos suficientes para proyectar trafico.";
  applyConfidenceBadge(refs.predictionTrafficConfidence, traffic.confidence || "baja");

  refs.predictionFunnelTitle.textContent = funnel.title || "Prediccion del embudo de clientes";
  refs.predictionFunnelBody.textContent = funnel.body || "Sin datos suficientes para proyectar embudo de clientes.";
  applyConfidenceBadge(refs.predictionFunnelConfidence, funnel.confidence || "baja");

  refs.predictionProductsTitle.textContent = products.title || "Liderazgo de producto";
  refs.predictionProductsBody.textContent = products.body || "Sin datos suficientes para proyectar producto lider.";
  applyConfidenceBadge(refs.predictionProductsConfidence, products.confidence || "baja");

  refs.predictionCategoriesTitle.textContent = categories.title || "Liderazgo por categoria";
  refs.predictionCategoriesBody.textContent = categories.body || "Sin datos suficientes para proyectar categoria lider.";
  applyConfidenceBadge(refs.predictionCategoriesConfidence, categories.confidence || "baja");

  refs.predictionWhatsappTitle.textContent = whatsapp.title || "Intencion en WhatsApp";
  refs.predictionWhatsappBody.textContent = whatsapp.body || "Sin datos suficientes para proyectar clics en WhatsApp.";
  applyConfidenceBadge(refs.predictionWhatsappConfidence, whatsapp.confidence || "baja");
}

function renderActionPlan(actionPlan) {
  const safe = actionPlan && typeof actionPlan === "object" ? actionPlan : {};
  const alerts = Array.isArray(safe.alerts) ? safe.alerts : [];
  const recommendations = Array.isArray(safe.recommendations) ? safe.recommendations : [];

  if (!alerts.length) {
    refs.alertsList.innerHTML = `
      <div class="alert alert-brand-subtle mb-0">Sin alertas criticas en este momento.</div>
    `;
  } else {
    refs.alertsList.innerHTML = alerts
      .map((item) => {
        const level = String(item.level || "media").toLowerCase();
        const css = level === "alta" ? "alert-danger" : level === "media" ? "alert-warning" : "alert-brand-subtle";
        return `
          <article class="alert ${css} mb-0">
            <p class="small text-uppercase letter-space mb-1">Prioridad ${escapeHtml(level)}</p>
            <h4 class="h6 mb-1">${escapeHtml(item.title || "Alerta")}</h4>
            <p class="mb-0 small">${escapeHtml(item.detail || "Sin detalle")}</p>
          </article>
        `;
      })
      .join("");
  }

  if (!recommendations.length) {
    refs.recommendationsList.innerHTML = `
      <div class="alert alert-brand-subtle mb-0">Sin recomendaciones disponibles por falta de datos.</div>
    `;
    return;
  }

  refs.recommendationsList.innerHTML = recommendations
    .map((item) => {
      return `
        <article class="border border-brand-subtle rounded-4 p-3 bg-white">
          <p class="small text-uppercase letter-space text-muted-brand mb-1">Prioridad ${escapeHtml(String(item.priority || "media"))}</p>
          <h4 class="h6 mb-1">${escapeHtml(item.title || "Recomendacion")}</h4>
          <p class="mb-0 small text-muted-brand">${escapeHtml(item.action || "Sin accion sugerida")}</p>
        </article>
      `;
    })
    .join("");
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
    renderInsights(data.insights || {});
    renderPredictions(data.predictions || {});
    renderActionPlan(data.actionPlan || {});
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
