import { authHeaders, clearToken, forceLogout, getToken, login, setToken } from "./auth";

const TOKEN_KEY = "bff.access_token";

beforeEach(() => {
  vi.unstubAllGlobals(); // drop any fake localStorage/location a test installed
  localStorage.clear();
  clearToken(); // reset the in-memory cache too
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

  it("setToken still updates memory when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    expect(() => setToken("mem-only")).not.toThrow();
    expect(getToken()).toBe("mem-only");
  });

  it("clearToken still clears memory when localStorage.removeItem throws", () => {
    setToken("abc123");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    expect(() => clearToken()).not.toThrow();
    expect(getToken()).toBeNull();
  });
});

describe("readToken (module load)", () => {
  it("returns null instead of throwing when localStorage access is blocked", async () => {
    vi.resetModules();
    const getItem = vi.fn(() => {
      throw new Error("access denied"); // e.g. Safari private mode / disabled storage
    });
    vi.stubGlobal("localStorage", { getItem, setItem: vi.fn(), removeItem: vi.fn() });

    const fresh = await import("./auth");

    expect(getItem).toHaveBeenCalledWith(TOKEN_KEY);
    expect(fresh.getToken()).toBeNull();

    vi.resetModules(); // let the other files keep the real module
  });
});

describe("forceLogout", () => {
  it("clears the token and reloads the page", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    setToken("abc123");

    forceLogout();

    expect(getToken()).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
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
