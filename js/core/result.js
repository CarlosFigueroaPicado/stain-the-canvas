export function ok(data) {
  return { success: true, data: data == null ? null : data };
}

export function fail(error) {
  return { success: false, error: String(error || "Operacion no completada.") };
}
