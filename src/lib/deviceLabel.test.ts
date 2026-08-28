import { bool, clamp, deviceLabel, num } from "./deviceLabel";

describe("clamp", () => {
  it("keeps a value inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below and above", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});

describe("num / bool", () => {
  it("num returns the value only when it is a number", () => {
    expect(num({ brightness: 30 }, "brightness")).toBe(30);
    expect(num({ brightness: "30" }, "brightness")).toBeUndefined();
    expect(num(null, "brightness")).toBeUndefined();
  });
  it("bool is strict about true", () => {
    expect(bool({ on: true }, "on")).toBe(true);
    expect(bool({ on: "true" }, "on")).toBe(false);
    expect(bool(undefined, "on")).toBe(false);
  });
});

describe("deviceLabel", () => {
  it("renders a placeholder when state is missing", () => {
    expect(deviceLabel("light", null)).toEqual({ text: "—", on: false });
  });

  it("light on/off", () => {
    expect(deviceLabel("light", { on: true })).toEqual({ text: "Ligada", on: true });
    expect(deviceLabel("light", { on: false })).toEqual({ text: "Desligada", on: false });
  });

  it("dimmable_light includes brightness when present", () => {
    expect(deviceLabel("dimmable_light", { on: true, brightness: 40 })).toEqual({
      text: "Ligada (40%)",
      on: true,
    });
    expect(deviceLabel("dimmable_light", { on: true })).toEqual({ text: "Ligada", on: true });
    expect(deviceLabel("dimmable_light", { on: false, brightness: 40 })).toEqual({
      text: "Desligada",
      on: false,
    });
  });

  it("ac includes temperature when present", () => {
    expect(deviceLabel("ac", { on: true, temperature: 22 })).toEqual({
      text: "Ligado (22°C)",
      on: true,
    });
    expect(deviceLabel("ac", { on: false })).toEqual({ text: "Desligado", on: false });
  });

  it("curtain and window share the open/closed wording", () => {
    expect(deviceLabel("curtain", { open: true })).toEqual({ text: "Aberta", on: true });
    expect(deviceLabel("window", { open: false })).toEqual({ text: "Fechada", on: false });
  });

  it("door combines lock and open state; on = unlocked", () => {
    expect(deviceLabel("door", { locked: true, open: false })).toEqual({
      text: "Trancada",
      on: false,
    });
    expect(deviceLabel("door", { locked: false, open: true })).toEqual({
      text: "Destrancada · aberta",
      on: true,
    });
  });

  it("motion_sensor and alarm", () => {
    expect(deviceLabel("motion_sensor", { active: true })).toEqual({ text: "Presença", on: true });
    expect(deviceLabel("alarm", { armed: true })).toEqual({ text: "Armado", on: true });
    expect(deviceLabel("alarm", { armed: false })).toEqual({ text: "Desarmado", on: false });
  });

  it("falls back to a generic on/off for unknown types", () => {
    expect(deviceLabel("tv", { on: true })).toEqual({ text: "Ligado", on: true });
    expect(deviceLabel("coffee_maker", { on: false })).toEqual({ text: "Desligado", on: false });
  });
});
