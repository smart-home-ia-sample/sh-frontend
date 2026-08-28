import { authHeaders, clearToken, getToken, login, setToken } from "./auth";

const TOKEN_KEY = "bff.access_token";

beforeEach(() => {
  localStorage.clear();
  clearToken(); // reset the in-memory cache too
  vi.unstubAllGlobals();
});

describe("token cache", () => {
  it("setToken exposes the token and persists it", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123");
    expect(authHeaders()).toEqual({ Authorization: "Bearer abc123" });
  });

  it("clearToken wipes memory and storage", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(authHeaders()).toEqual({});
  });
});

describe("login", () => {
  it("stores the access_token from a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "jwt-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await login("demo", "demo");

    expect(fetchMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "demo", password: "demo" }),
      }),
    );
    expect(getToken()).toBe("jwt-token");
  });

  it("maps 401 to a friendly message and keeps no token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    await expect(login("demo", "wrong")).rejects.toThrow("Usuário ou senha inválidos.");
    expect(getToken()).toBeNull();
  });

  it("reports other HTTP failures with the status code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    await expect(login("demo", "demo")).rejects.toThrow("Falha no login (500).");
  });

  it("rejects a 200 response that has no token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );

    await expect(login("demo", "demo")).rejects.toThrow("Resposta de login sem token.");
    expect(getToken()).toBeNull();
  });
});
