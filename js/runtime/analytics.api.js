(function analyticsApi() {
  function getClient() {
    return window.getSupabaseClient && typeof window.getSupabaseClient === "function"
      ? window.getSupabaseClient()
      : null;
  }

  async function insertVisit(payload) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.from("visitas").insert(payload);
  }

  async function insertEvent(payload) {
    const client = getClient();
    if (!client) {
      return { error: { message: "no_client" } };
    }

    return client.from("eventos").insert(payload);
  }

  window.stcApis = window.stcApis || {};
  window.stcApis.analytics = Object.freeze({
    insertVisit,
    insertEvent
  });
})();
