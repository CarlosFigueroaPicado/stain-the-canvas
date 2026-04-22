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

function aggregateTopWhatsappProducts(clickRows, productMap) {
  const counts = new Map();

  (Array.isArray(clickRows) ? clickRows : []).forEach((row) => {
    const productId = String(row && row.producto_id ? row.producto_id : "").trim();
    if (!productId) {
      return;
    }

    counts.set(productId, (counts.get(productId) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([id, clicks]) => {
      const meta = productMap.get(id) || {};
      return {
        id,
        clicks,
        nombre: meta.nombre || `Producto ${id.slice(0, 8)}`,
        categoria: meta.categoria || "Sin categoria"
      };
    })
    .sort((a, b) => b.clicks - a.clicks);
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
    topWhatsappProducts: Array.isArray(safePayload.topWhatsappProducts) ? safePayload.topWhatsappProducts : [],
    byCategory: Array.isArray(safePayload.byCategory) ? safePayload.byCategory : []
  };
}

function createCutoffIso(days) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

function sumDayTotals(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((acc, row) => acc + Number(row && row.total ? row.total : 0), 0);
}

function toPercent(part, total) {
  const safePart = Number(part || 0);
  const safeTotal = Number(total || 0);
  if (!Number.isFinite(safePart) || !Number.isFinite(safeTotal) || safeTotal <= 0) {
    return 0;
  }

  return (safePart / safeTotal) * 100;
}

function formatSignedPercent(value) {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe > 0) {
    return `+${safe.toFixed(1)}%`;
  }

  return `${safe.toFixed(1)}%`;
}

function buildDashboardInsights(metrics) {
  const safe = metrics && typeof metrics === "object" ? metrics : {};
  const totals = safe.totals && typeof safe.totals === "object" ? safe.totals : {};
  const visitSeries = Array.isArray(safe.visitSeries) ? safe.visitSeries : [];
  const topProducts = Array.isArray(safe.topProducts) ? safe.topProducts : [];
  const byCategory = Array.isArray(safe.byCategory) ? safe.byCategory : [];
  const topWhatsappProducts = Array.isArray(safe.topWhatsappProducts) ? safe.topWhatsappProducts : [];

  const last7 = visitSeries.slice(-7);
  const previous7 = visitSeries.slice(-14, -7);
  const last7Total = sumDayTotals(last7);
  const previous7Total = sumDayTotals(previous7);
  const trafficDelta = previous7Total > 0 ? ((last7Total - previous7Total) / previous7Total) * 100 : 0;

  let trafficTitle = "Trafico estable";
  if (trafficDelta >= 8) {
    trafficTitle = "El trafico esta subiendo";
  } else if (trafficDelta <= -8) {
    trafficTitle = "El trafico esta bajando";
  }

  const totalVisitas = Number(totals.totalVisitas || 0);
  const totalVistas = Number(totals.totalVistas || 0);
  const totalClicks = Number(totals.totalClicks || 0);
  const viewRate = toPercent(totalVistas, totalVisitas);
  const clickRate = toPercent(totalClicks, totalVistas);

  let funnelTitle = "Embudo con oportunidad de mejora";
  if (clickRate >= 22) {
    funnelTitle = "El embudo esta funcionando bien";
  } else if (clickRate < 10 && totalVistas > 0) {
    funnelTitle = "Pocas personas llegan a WhatsApp";
  }

  const topProduct = topProducts[0] || null;
  const topProductTotal = topProducts.slice(0, 5).reduce((acc, item) => acc + Number(item.vistas || 0), 0);
  const topProductShare = topProduct ? toPercent(Number(topProduct.vistas || 0), topProductTotal) : 0;

  const topCategory = byCategory[0] || null;
  const categoryTotal = byCategory.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const topCategoryShare = topCategory ? toPercent(Number(topCategory.total || 0), categoryTotal) : 0;

  const topWhatsapp = topWhatsappProducts[0] || null;

  return {
    traffic: {
      title: trafficTitle,
      body:
        previous7Total > 0
          ? `En 7 dias hubo ${last7Total} visitas (${formatSignedPercent(trafficDelta)} vs la semana anterior).`
          : `En 7 dias hubo ${last7Total} visitas. Aun no hay suficiente historial para comparar.`
    },
    funnel: {
      title: funnelTitle,
      body: `De ${totalVisitas} visitas, ${totalVistas} llegaron a productos (${viewRate.toFixed(1)}%) y ${totalClicks} fueron a WhatsApp (${clickRate.toFixed(1)}%).`
    },
    products: {
      title: topProduct ? `Producto que mas atrae: ${topProduct.nombre}` : "Aun no hay producto lider",
      body: topProduct
        ? `${Number(topProduct.vistas || 0)} vistas, equivalente al ${topProductShare.toFixed(1)}% del top 5.`
        : "Todavia no hay datos suficientes para evaluar productos."
    },
    categories: {
      title: topCategory ? `Categoria con mayor interes: ${topCategory.categoria}` : "Aun no hay categoria lider",
      body: topCategory
        ? `${Number(topCategory.total || 0)} vistas (${topCategoryShare.toFixed(1)}% del interes por categoria).`
        : "Todavia no hay datos suficientes para evaluar categorias."
    },
    whatsapp: {
      title: topWhatsapp ? `Producto con mayor intencion de compra: ${topWhatsapp.nombre}` : "Aun no hay lider en WhatsApp",
      body: topWhatsapp
        ? `${Number(topWhatsapp.clicks || 0)} clics en WhatsApp para este producto.`
        : "No hay clics en WhatsApp vinculados a productos en este periodo."
    }
  };
}

function computeVolatility(values) {
  const safe = (Array.isArray(values) ? values : []).filter((item) => Number.isFinite(Number(item)));
  if (safe.length < 2) {
    return 0;
  }

  const mean = safe.reduce((acc, item) => acc + Number(item), 0) / safe.length;
  if (mean === 0) {
    return 0;
  }

  const variance = safe.reduce((acc, item) => {
    const diff = Number(item) - mean;
    return acc + diff * diff;
  }, 0) / (safe.length - 1);

  return Math.sqrt(variance) / Math.abs(mean);
}

function confidenceFromData(values) {
  const safe = Array.isArray(values) ? values : [];
  const volatility = computeVolatility(safe);

  if (safe.length >= 28 && volatility <= 0.35) {
    return "alta";
  }

  if (safe.length >= 14 && volatility <= 0.7) {
    return "media";
  }

  return "baja";
}

function clampNonNegative(value) {
  const safe = Number(value || 0);
  if (!Number.isFinite(safe)) {
    return 0;
  }

  return safe < 0 ? 0 : safe;
}

function predictNextWindowFromSeries(visitSeries, horizonDays) {
  const source = Array.isArray(visitSeries) ? visitSeries : [];
  const horizon = Number.isInteger(horizonDays) && horizonDays > 0 ? horizonDays : 7;
  const totals = source.map((row) => Number(row && row.total ? row.total : 0));
  const last7 = totals.slice(-7);
  const prev7 = totals.slice(-14, -7);
  const last7Avg = last7.length > 0 ? sumDayTotals(last7.map((total) => ({ total }))) / last7.length : 0;
  const prev7Avg = prev7.length > 0 ? sumDayTotals(prev7.map((total) => ({ total }))) / prev7.length : last7Avg;
  const dailyTrend = last7Avg - prev7Avg;
  const predictedDaily = clampNonNegative(last7Avg + dailyTrend * 0.35);
  const total = Math.round(predictedDaily * horizon);
  const volatility = computeVolatility(last7);
  const marginRatio = Math.min(0.45, Math.max(0.12, volatility * 0.9 + 0.12));
  const lower = Math.round(clampNonNegative(total * (1 - marginRatio)));
  const upper = Math.round(clampNonNegative(total * (1 + marginRatio)));

  return {
    total,
    lower,
    upper,
    confidence: confidenceFromData(totals)
  };
}

function buildDashboardPredictions(metrics) {
  const safe = metrics && typeof metrics === "object" ? metrics : {};
  const totals = safe.totals && typeof safe.totals === "object" ? safe.totals : {};
  const visitSeries = Array.isArray(safe.visitSeries) ? safe.visitSeries : [];
  const topProducts = Array.isArray(safe.topProducts) ? safe.topProducts : [];
  const byCategory = Array.isArray(safe.byCategory) ? safe.byCategory : [];
  const topWhatsappProducts = Array.isArray(safe.topWhatsappProducts) ? safe.topWhatsappProducts : [];

  const trafficPrediction = predictNextWindowFromSeries(visitSeries, 7);

  const baseViews = Number(totals.totalVistas || 0);
  const baseClicks = Number(totals.totalClicks || 0);
  const currentConversion = toPercent(baseClicks, baseViews);
  const predictedViews = Math.round(clampNonNegative(trafficPrediction.total * Math.max(0.5, toPercent(baseViews, Number(totals.totalVisitas || 0)) / 100)));
  const predictedClicks = Math.round(clampNonNegative(predictedViews * (currentConversion / 100)));
  const conversionConfidence = confidenceFromData([currentConversion, predictedViews, predictedClicks]);

  const topProduct = topProducts[0] || null;
  const secondProduct = topProducts[1] || null;
  const topProductGap = topProduct && secondProduct ? Number(topProduct.vistas || 0) - Number(secondProduct.vistas || 0) : 0;
  const productConfidence = topProductGap >= 8 ? "alta" : topProductGap >= 3 ? "media" : "baja";

  const topCategory = byCategory[0] || null;
  const secondCategory = byCategory[1] || null;
  const topCategoryGap = topCategory && secondCategory ? Number(topCategory.total || 0) - Number(secondCategory.total || 0) : 0;
  const categoryConfidence = topCategoryGap >= 10 ? "alta" : topCategoryGap >= 4 ? "media" : "baja";

  const topWhatsapp = topWhatsappProducts[0] || null;
  const whatsappForecast = Math.round(
    clampNonNegative(
      Number(topWhatsapp && topWhatsapp.clicks ? topWhatsapp.clicks : 0) * (trafficPrediction.total > 0 ? trafficPrediction.total / Math.max(1, Number(totals.totalVisitas || 1)) : 0)
    )
  );

  return {
    traffic: {
      title: "Lo esperado para trafico (7 dias)",
      body: `Esperamos ${trafficPrediction.total} visitas. Rango probable: ${trafficPrediction.lower} a ${trafficPrediction.upper}.`,
      confidence: trafficPrediction.confidence
    },
    funnel: {
      title: "Lo esperado para conversion",
      body: `Se estiman ${predictedViews} vistas de producto y ${predictedClicks} clics a WhatsApp la proxima semana.`,
      confidence: conversionConfidence
    },
    products: {
      title: topProduct ? `Producto con mayor probabilidad de liderar: ${topProduct.nombre}` : "Sin lider proyectado",
      body: topProduct
        ? `Es probable que se mantenga arriba en vistas (ventaja actual: ${Math.max(0, topProductGap)}).`
        : "No hay datos suficientes para estimar el liderazgo por producto.",
      confidence: topProduct ? productConfidence : "baja"
    },
    categories: {
      title: topCategory ? `Categoria con mayor probabilidad de liderar: ${topCategory.categoria}` : "Sin categoria lider proyectada",
      body: topCategory
        ? `Tiene una ventaja actual de ${Math.max(0, topCategoryGap)} eventos sobre la siguiente categoria.`
        : "No hay datos suficientes para estimar el liderazgo por categoria.",
      confidence: topCategory ? categoryConfidence : "baja"
    },
    whatsapp: {
      title: topWhatsapp ? `Producto con mayor probabilidad de clic en WhatsApp: ${topWhatsapp.nombre}` : "Sin lider proyectado en WhatsApp",
      body: topWhatsapp
        ? `Se proyectan ${whatsappForecast} clics para este producto la proxima semana.`
        : "No hay datos suficientes para proyectar clics por producto.",
      confidence: topWhatsapp ? confidenceFromData(topWhatsappProducts.map((item) => Number(item.clicks || 0))) : "baja"
    }
  };
}

function buildDashboardActionPlan(metrics) {
  const safe = metrics && typeof metrics === "object" ? metrics : {};
  const totals = safe.totals && typeof safe.totals === "object" ? safe.totals : {};
  const topProducts = Array.isArray(safe.topProducts) ? safe.topProducts : [];
  const topWhatsappProducts = Array.isArray(safe.topWhatsappProducts) ? safe.topWhatsappProducts : [];
  const byCategory = Array.isArray(safe.byCategory) ? safe.byCategory : [];

  const totalVisitas = Number(totals.totalVisitas || 0);
  const totalVistas = Number(totals.totalVistas || 0);
  const totalClicks = Number(totals.totalClicks || 0);
  const conversion = toPercent(totalClicks, totalVistas);

  const alerts = [];
  if (totalVisitas < 30) {
    alerts.push({
      level: "media",
      title: "Bajo volumen de trafico",
      detail: "El volumen de visitas es bajo para sacar conclusiones robustas; prioriza campañas de alcance."
    });
  }

  if (totalVistas > 0 && conversion < 10) {
    alerts.push({
      level: "alta",
      title: "Baja conversion hacia WhatsApp",
      detail: "Menos del 10% de vistas terminan en clic de WhatsApp; revisa propuesta de valor y llamados a la accion."
    });
  }

  const topViewed = topProducts[0] || null;
  const topClicked = topWhatsappProducts[0] || null;
  if (topViewed && topClicked && topViewed.id !== topClicked.id) {
    alerts.push({
      level: "media",
      title: "Desalineacion entre interes y contacto",
      detail: `El producto mas visto es ${topViewed.nombre}, pero el mayor interes de contacto se concentra en ${topClicked.nombre}.`
    });
  }

  const recommendations = [];
  if (topClicked) {
    recommendations.push({
      priority: "alta",
      title: "Escalar producto con alta intencion",
      action: `Destaca ${topClicked.nombre} en portada y pauta de WhatsApp para capitalizar su intencion de compra.`
    });
  }

  const topCategory = byCategory[0] || null;
  if (topCategory) {
    recommendations.push({
      priority: "media",
      title: "Profundizar categoria lider",
      action: `Amplia el catalogo y creatividades de ${topCategory.categoria} para sostener su traccion.`
    });
  }

  if (totalVistas > 0 && conversion < 15) {
    recommendations.push({
      priority: "alta",
      title: "Optimizar CTA de WhatsApp",
      action: "Prueba copys mas directos, beneficios claros y ubicaciones visibles del boton en productos con muchas vistas."
    });
  }

  recommendations.push({
    priority: "media",
    title: "Monitorear rendimiento semanal",
    action: "Revisa cada 7 dias variacion de trafico, conversion y liderazgo de productos para ajustar inventario y promociones."
  });

  return {
    alerts,
    recommendations: recommendations.slice(0, 4)
  };
}

export async function loadDashboardMetrics(days = 90) {
  const safeDays = clampDays(days);
  const sinceIso = createCutoffIso(safeDays);

  try {
    const rpcResult = await dashboardApi.getDashboardMetrics(safeDays);
    if (!rpcResult.error && rpcResult.data) {
      const normalized = normalizeRpcPayload(rpcResult.data);
      return ok({
        ...normalized,
        insights: buildDashboardInsights(normalized),
        predictions: buildDashboardPredictions(normalized),
        actionPlan: buildDashboardActionPlan(normalized)
      });
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
    clickRowsResult,
    productsResult
  ] = await Promise.all([
    dashboardApi.countVisitas(sinceIso),
    dashboardApi.countEventByType("view_producto", sinceIso),
    dashboardApi.countWhatsappClicksByProduct(sinceIso),
    fetchPagedRows((from, to) => dashboardApi.fetchVisitasRange(from, to, sinceIso), 1000),
    fetchPagedRows((from, to) => dashboardApi.fetchViewsRange(from, to, sinceIso), 1000),
    fetchPagedRows((from, to) => dashboardApi.fetchWhatsappClicksRange(from, to, sinceIso), 1000),
    dashboardApi.fetchProductsLite()
  ]);

  const results = [
    visitasCountResult,
    vistasCountResult,
    clicksCountResult,
    visitasRowsResult,
    viewRowsResult,
    clickRowsResult,
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
  const clickRows = Array.isArray(clickRowsResult.data) ? clickRowsResult.data : [];
  const productMap = buildProductMap(productsResult.data || []);

  const payload = {
    totals: {
      totalVisitas,
      totalVistas,
      totalClicks,
      conversion
    },
    visitSeries: groupByDay(visitasRows, "fecha"),
    topProducts: aggregateTopProducts(viewRows, productMap),
    topWhatsappProducts: aggregateTopWhatsappProducts(clickRows, productMap),
    byCategory: aggregateByCategory(viewRows, productMap)
  };

  return ok({
    ...payload,
    insights: buildDashboardInsights(payload),
    predictions: buildDashboardPredictions(payload),
    actionPlan: buildDashboardActionPlan(payload)
  });
}
