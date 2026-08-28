import { fetchHomeStatusSnapshot, sendDeviceCommand } from "./orchestratorClient";
import { forceLogout } from "./auth";

vi.mock("./auth", () => ({
  authHeaders: () => ({ Authorization: "Bearer test" }),
  forceLogout: vi.fn(),
}));

const forceLogoutMock = vi.mocked(forceLogout);

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  };
}

beforeEach(() => {
  forceLogoutMock.mockClear();
  vi.unstubAllGlobals();
});

describe("sendDeviceCommand", () => {
  it("omits value from the body when it is undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await sendDeviceCommand("dev-1", "turn_on");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/devices/dev-1/command");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ action: "turn_on" });
  });

  it("includes value when given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await sendDeviceCommand("dev-1", "set_brightness", 60);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: "set_brightness",
      value: 60,
    });
  });

  it("logs out and throws on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 401 })));

    await expect(sendDeviceCommand("dev-1", "turn_on")).rejects.toThrow("sessão expirada");
    expect(forceLogoutMock).toHaveBeenCalledOnce();
  });

  it("surfaces the server-provided error detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "device not provisioned yet" }, { ok: false, status: 409 })),
    );

    await expect(sendDeviceCommand("dev-1", "turn_on")).rejects.toThrow("device not provisioned yet");
    expect(forceLogoutMock).not.toHaveBeenCalled();
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error("not json");
      },
    }));

    await expect(sendDeviceCommand("dev-1", "turn_on")).rejects.toThrow("HTTP 503");
  });
});

describe("fetchHomeStatusSnapshot", () => {
  it("returns the parsed snapshot on success", async () => {
    const snapshot = { simulatorOnline: true, rooms: [], rollups: {}, events: [] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(snapshot)));

    await expect(fetchHomeStatusSnapshot()).resolves.toEqual(snapshot);
  });

  it("logs out on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 401 })));

    await expect(fetchHomeStatusSnapshot()).rejects.toThrow("sessão expirada");
    expect(forceLogoutMock).toHaveBeenCalledOnce();
  });

  it("throws with the status on other failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, { ok: false, status: 500 })));

    await expect(fetchHomeStatusSnapshot()).rejects.toThrow("home-status request failed: 500");
  });
});
