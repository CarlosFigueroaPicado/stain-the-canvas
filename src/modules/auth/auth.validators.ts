export function sanitizeRedirect(value: string): string {
  const raw = String(value || "").trim();
  return /^[a-zA-Z0-9_-]+\.html$/.test(raw) ? raw : "admin.html";
}

export function isValidLoginInput(email: string, password: string): string {
  const cleanEmail = String(email || "").trim();
  const cleanPassword = String(password || "");

  if (!cleanEmail || !cleanPassword) {
    return "Completa correo y contrasena.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return "Ingresa un correo valido.";
  }

  return "";
}
