function makeTraceId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export function reportFailure(scope, error, context = {}) {
  const traceId = makeTraceId();
  const errorMessage =
    error && typeof error === "object" && error.message
      ? String(error.message)
      : error instanceof Error
        ? error.message
        : String(error || "error_desconocido");
  console.error(`[${String(scope || "app")}] trace=${traceId}`, {
    message: errorMessage,
    context: context && typeof context === "object" ? context : {}
  });
  return traceId;
}
