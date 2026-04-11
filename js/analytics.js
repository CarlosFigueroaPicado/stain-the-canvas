(function analyticsModule() {
  const SESSION_KEY = "stc_session_id";

  function getSupabaseClient() {
    if (!window.getSupabaseClient || typeof window.getSupabaseClient !== "function") {
      return null;
    }

    return window.getSupabaseClient();
  }

  function generateSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    const random = Math.random().toString(36).slice(2, 12);
    return `stc-${Date.now()}-${random}`;
  }

  function getOrCreateSessionId() {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) {
      return existing;
    }

    const created = generateSessionId();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  }

  function toDayKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString().slice(0, 10);
  }

  function groupByDay(rows, fieldName) {
    const source = Array.isArray(rows) ? rows : [];
    const keyName = String(fieldName || "fecha");
    const grouped = new Map();

    source.forEach((row) => {
      const day = toDayKey(row && row[keyName]);
      if (!day) {
        return;
      }

      grouped.set(day, (grouped.get(day) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, total]) => ({ day, total }));
  }

  function formatNumber(value) {
    const safe = Number(value || 0);
    return new Intl.NumberFormat("es-NI").format(Number.isFinite(safe) ? safe : 0);
  }

  function formatPercent(value) {
    const safe = Number(value || 0);
    return `${(Number.isFinite(safe) ? safe : 0).toFixed(1)}%`;
  }

  async function trackVisit() {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, reason: "no_client" };
    }

    try {
      const result = await client.from("visitas").insert({
        session_id: getOrCreateSessionId(),
        user_agent: String(navigator.userAgent || "").slice(0, 500)
      });

      if (result.error) {
        console.error("No se pudo registrar visita:", result.error);
        return { ok: false, reason: result.error.message || "insert_failed" };
      }

      return { ok: true };
    } catch (error) {
      console.error("Error inesperado al registrar visita:", error);
      return { ok: false, reason: "unexpected_error" };
    }
  }

  async function trackEvent(payload) {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, reason: "no_client" };
    }

    const safe = payload && typeof payload === "object" ? payload : {};
    const tipo = String(safe.tipo || "").trim();
    if (!tipo) {
      return { ok: false, reason: "missing_tipo" };
    }

    try {
      const result = await client.from("eventos").insert({
        tipo,
        producto_id: safe.producto_id || null,
        categoria: safe.categoria || null,
        session_id: getOrCreateSessionId()
      });

      if (result.error) {
        console.error("No se pudo registrar evento:", result.error);
        return { ok: false, reason: result.error.message || "insert_failed" };
      }

      return { ok: true };
    } catch (error) {
      console.error("Error inesperado al registrar evento:", error);
      return { ok: false, reason: "unexpected_error" };
    }
  }

  window.analyticsModule = Object.freeze({
    formatNumber,
    formatPercent,
    getOrCreateSessionId,
    groupByDay,
    toDayKey,
    trackVisit,
    trackEvent
  });
})();