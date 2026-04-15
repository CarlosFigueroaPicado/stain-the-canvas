(function dashboardApi() {
  function getClient() {
    return window.getSupabaseClient && typeof window.getSupabaseClient === "function"
      ? window.getSupabaseClient()
      : null;
  }

  async function getDashboardMetrics(days) {
    const client = getClient();
    if (!client) {
      return { data: null, error: { message: "no_client" } };
    }

    return client.rpc("get_dashboard_metrics", { p_days: days });
  }

  async function countVisitas() {
    const client = getClient();
    if (!client) {
      return { count: 0, error: { message: "no_client" } };
    }

    return client.from("visitas").select("id", { count: "exact", head: true });
  }

  async function countEventByType(tipo) {
    const client = getClient();
    if (!client) {
      return { count: 0, error: { message: "no_client" } };
    }

    return client.from("eventos").select("id", { count: "exact", head: true }).eq("tipo", tipo);
  }

  async function fetchVisitasRange(from, to) {
    const client = getClient();
    if (!client) {
      return { data: [], error: { message: "no_client" } };
    }

    return client.from("visitas").select("fecha").order("fecha", { ascending: true }).range(from, to);
  }

  async function fetchViewsRange(from, to) {
    const client = getClient();
    if (!client) {
      return { data: [], error: { message: "no_client" } };
    }

    return client
      .from("eventos")
      .select("producto_id,categoria,fecha")
      .eq("tipo", "view_producto")
      .order("fecha", { ascending: true })
      .range(from, to);
  }

  async function fetchProductsLite(table) {
    const client = getClient();
    if (!client) {
      return { data: [], error: { message: "no_client" } };
    }

    return client.from(table).select("id,nombre,categoria");
  }

  window.stcApis = window.stcApis || {};
  window.stcApis.dashboard = Object.freeze({
    getDashboardMetrics,
    countVisitas,
    countEventByType,
    fetchVisitasRange,
    fetchViewsRange,
    fetchProductsLite
  });
})();
