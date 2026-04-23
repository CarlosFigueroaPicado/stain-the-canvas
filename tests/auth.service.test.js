import { beforeEach, describe, expect, it, vi } from "vitest";

const authApiMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  updatePassword: vi.fn(),
  getAdminMembership: vi.fn()
}));

const supabaseClientMock = vi.hoisted(() => ({
  getLastSupabaseClientError: vi.fn()
}));

vi.mock("../js/modules/auth/api.js", () => authApiMock);
vi.mock("../js/core/supabase-client.js", () => supabaseClientMock);

import { getState, setState } from "../js/core/store.js";
import { login, requireAdmin, resolveCurrentUser } from "../js/modules/auth/service.js";

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setState({ user: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("inicia sesion admin cuando el usuario tiene rol admin", async () => {
    authApiMock.signInWithPassword.mockResolvedValue({ error: null });
    authApiMock.getSession.mockResolvedValue({
      data: { session: { user: { id: "admin-1", app_metadata: { role: "admin" } } } },
      error: null
    });
    authApiMock.getUser.mockResolvedValue({
      data: { user: { id: "admin-1", app_metadata: { role: "admin" } } },
      error: null
    });
    authApiMock.getAdminMembership.mockResolvedValue({ data: null, error: null });

    const result = await login("admin@test.com", "password123");

    expect(result.success).toBe(true);
    expect(getState().user).toEqual(expect.objectContaining({ id: "admin-1" }));
    expect(authApiMock.signOut).not.toHaveBeenCalled();
  });

  it("cierra sesion si usuario no tiene permisos admin", async () => {
    authApiMock.signInWithPassword.mockResolvedValue({ error: null });
    authApiMock.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1", app_metadata: {} } } },
      error: null
    });
    authApiMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1", app_metadata: {} } },
      error: null
    });
    authApiMock.getAdminMembership.mockResolvedValue({ data: null, error: null });
    authApiMock.signOut.mockResolvedValue({ error: null });

    const result = await login("user@test.com", "password123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no tiene permisos");
    expect(authApiMock.signOut).toHaveBeenCalledTimes(1);
  });

  it("mapea error no_client con detalle del cliente", async () => {
    supabaseClientMock.getLastSupabaseClientError.mockReturnValue("detalle cliente");
    authApiMock.signInWithPassword.mockResolvedValue({
      error: { message: "no_client" }
    });

    const result = await login("admin@test.com", "password123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("detalle cliente");
  });

  it("requireAdmin sin redirect devuelve false cuando no hay sesion valida", async () => {
    authApiMock.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });
    authApiMock.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    const result = await requireAdmin({ redirect: false });

    expect(result.success).toBe(true);
    expect(result.data).toBe(false);
  });

  it("resolveCurrentUser falla cuando getSession retorna error", async () => {
    authApiMock.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: "network_error" }
    });

    const result = await resolveCurrentUser();

    expect(result.success).toBe(false);
    expect(getState().user).toBe(null);
  });
});
