// Pure presentation helpers for device state — kept out of the view so they can
// be unit-tested in isolation.

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function num(state: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const v = state?.[key];
  return typeof v === "number" ? v : undefined;
}

export function bool(state: Record<string, unknown> | null | undefined, key: string): boolean {
  return state?.[key] === true;
}

/** Human label + a coarse on/off flag for a device of `type` in `state`. */
export function deviceLabel(
  type: string,
  state: Record<string, unknown> | null,
): { text: string; on: boolean } {
  if (!state) return { text: "—", on: false };
  switch (type) {
    case "light":
      return bool(state, "on") ? { text: "Ligada", on: true } : { text: "Desligada", on: false };
    case "dimmable_light": {
      const b = num(state, "brightness");
      return bool(state, "on")
        ? { text: b !== undefined ? `Ligada (${b}%)` : "Ligada", on: true }
        : { text: "Desligada", on: false };
    }
    case "ac": {
      const t = num(state, "temperature");
      return bool(state, "on")
        ? { text: t !== undefined ? `Ligado (${t}°C)` : "Ligado", on: true }
        : { text: "Desligado", on: false };
    }
    case "curtain":
    case "window":
      return bool(state, "open") ? { text: "Aberta", on: true } : { text: "Fechada", on: false };
    case "door": {
      const locked = bool(state, "locked");
      const open = bool(state, "open");
      return { text: `${locked ? "Trancada" : "Destrancada"}${open ? " · aberta" : ""}`, on: !locked };
    }
    case "motion_sensor":
      return bool(state, "active")
        ? { text: "Presença", on: true }
        : { text: "Sem presença", on: false };
    case "alarm":
      return bool(state, "armed") ? { text: "Armado", on: true } : { text: "Desarmado", on: false };
    default:
      return bool(state, "on") ? { text: "Ligado", on: true } : { text: "Desligado", on: false };
  }
}

export const TYPE_ICON: Record<string, string> = {
  light: "💡",
  dimmable_light: "💡",
  ac: "❄️",
  curtain: "🪟",
  window: "🪟",
  door: "🚪",
  tv: "📺",
  coffee_maker: "☕",
  refrigerator: "🧊",
  motion_sensor: "🚶",
  alarm: "🔔",
};
