export function normalizeErrorMessage(error, fallbackMessage) {
  if (!error) {
    return String(fallbackMessage || "Operación no completada.");
  }

  if (typeof error === "string") {
    return error.trim() || String(fallbackMessage || "Operación no completada.");
  }

  if (typeof error === "object" && error.message) {
    const message = String(error.message).trim();
    if (message) {
      return message;
    }
  }

  return String(fallbackMessage || "Operación no completada.");
}

export function formatFailureMessage(message, traceId) {
  const base = String(message || "Operación no completada.").trim();
  const trace = String(traceId || "").trim();
  return trace ? `${base} (ref: ${trace})` : base;
}
