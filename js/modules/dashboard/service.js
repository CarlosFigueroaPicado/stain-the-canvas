import * as dashboardApi from "./api.js";
import { fail, ok } from "../../core/result.js";
import { clampDays } from "../../shared/dashboard-helpers.js";
import { groupByDay } from "../analytics/service.js";

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

function normalizeRpcPayload(payload) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const totals = safePayload.totals && typeof safePayload.totals === "object" ? safePayload.totals : {};

  return {
    totals: {
      totalVisitas: Number(totals.totalVisitas || 0),
      totalVistas: Number(totals.totalVistas || 0),
      totalClicks: Number(totals.totalClicks || 0),
      conversion: Number(totals.conversion || 0)
    },
    visitSeries: Array.isArray(safePayload.visitSeries) ? safePayload.visitSeries : [],
    topProducts: Array.isArray(safePayload.topProducts) ? safePayload.topProducts : [],
    byCategory: Array.isArray(safePayload.byCategory) ? safePayload.byCategory : []
  };
}

function createCutoffIso(days) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

export async function loadDashboardMetrics(days = 90) {
  const safeDays = clampDays(days);
  const sinceIso = createCutoffIso(safeDays);

  try {
    const rpcResult = await dashboardApi.getDashboardMetrics(safeDays);
    if (!rpcResult.error && rpcResult.data) {
      return ok(normalizeRpcPayload(rpcResult.data));
    }

    if (rpcResult.error) {
      console.warn("RPC get_dashboard_metrics no disponible o fallo, usando modo legado:", rpcResult.error);
    }
  } catch (rpcError) {
    console.warn("RPC get_dashboard_metrics no disponible o fallo, usando modo legado:", rpcError);
  }

  const [
    visitasCountResult,
    vistasCountResult,
    clicksCountResult,
    visitasRowsResult,
    viewRowsResult,
    productsResult
  ] = await Promise.all([
    dashboardApi.countVisitas(sinceIso),
    dashboardApi.countEventByType("view_producto", sinceIso),
    dashboardApi.countEventByType("click_whatsapp", sinceIso),
    fetchPagedRows((from, to) => dashboardApi.fetchVisitasRange(from, to, sinceIso), 1000),
    fetchPagedRows((from, to) => dashboardApi.fetchViewsRange(from, to, sinceIso), 1000),
    dashboardApi.fetchProductsLite()
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
  const visitasRows = Array.isArray(visitasRowsResult.data) ? visitasRowsResult.data : [];
  const viewRows = Array.isArray(viewRowsResult.data) ? viewRowsResult.data : [];
  const productMap = buildProductMap(productsResult.data || []);

  return ok({
    totals: {
      totalVisitas,
      totalVistas,
      totalClicks,
      conversion
    },
    visitSeries: groupByDay(visitasRows, "fecha"),
    topProducts: aggregateTopProducts(viewRows, productMap),
    byCategory: aggregateByCategory(viewRows, productMap)
  });
}
