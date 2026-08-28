import { HttpAgent } from "@ag-ui/client";
import { authHeaders, forceLogout } from "./auth";

// Same origin as the page: everything goes through the BFF gateway.
export const API_BASE = "/api";

export function createAgent(threadId: string): HttpAgent {
  return new HttpAgent({
    url: `${API_BASE}/agui/run`,
    threadId,
    headers: authHeaders(),
  });
}

export interface DeviceStatus {
  deviceId: string;
  nickname: string;
  type: string;
  state: Record<string, unknown> | null;
}

export interface RoomStatus {
  slug: string;
  name: string;
  devices: DeviceStatus[];
}

export interface Rollups {
  alarmArmed: boolean;
  allDoorsLocked: boolean;
  openDoors: number;
  totalWatts: number;
  activeDevices: number;
}

export interface HomeEvent {
  deviceId: string;
  nickname: string;
  type: string;
  state: Record<string, unknown>;
  at: number;
}

export interface HomeStatus {
  simulatorOnline: boolean;
  rooms: RoomStatus[];
  rollups: Rollups;
  events: HomeEvent[];
}

export async function sendDeviceCommand(
  deviceId: string,
  action: string,
  value?: number,
): Promise<void> {
  const response = await fetch(`${API_BASE}/devices/${deviceId}/command`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(value === undefined ? { action } : { action, value }),
  });
  if (response.status === 401) {
    forceLogout();
    throw new Error("sessão expirada");
  }
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.error ?? body.detail ?? detail;
    } catch {
      /* keep the status */
    }
    throw new Error(detail);
  }
}

export async function fetchHomeStatusSnapshot(): Promise<HomeStatus> {
  const response = await fetch(`${API_BASE}/home-status/snapshot`, { headers: authHeaders() });
  if (response.status === 401) {
    forceLogout();
    throw new Error("sessão expirada");
  }
  if (!response.ok) {
    throw new Error(`home-status request failed: ${response.status}`);
  }
  return response.json();
}

interface DeviceDelta {
  deviceId: string;
  nickname: string;
  type: string;
  roomSlug: string;
  state: Record<string, unknown> | null;
  at: number;
  rollups: Rollups;
}

function reduceFrame(current: HomeStatus | null, event: string, data: unknown): HomeStatus | null {
  if (event === "snapshot") return data as HomeStatus;
  if (!current) return current;
  if (event === "device") return applyDelta(current, data as DeviceDelta);
  if (event === "simulator") {
    return { ...current, simulatorOnline: (data as { simulatorOnline: boolean }).simulatorOnline };
  }
  return current;
}

function applyDelta(status: HomeStatus, delta: DeviceDelta): HomeStatus {
  const rooms = status.rooms.map((room) => ({
    ...room,
    devices: room.devices.map((d) =>
      d.deviceId === delta.deviceId ? { ...d, state: delta.state } : d,
    ),
  }));
  const events = [
    { deviceId: delta.deviceId, nickname: delta.nickname, type: delta.type, state: delta.state ?? {}, at: delta.at },
    ...status.events,
  ].slice(0, 20);
  return { ...status, rooms, rollups: delta.rollups, events };
}

/**
 * Open the SSE stream. One full snapshot on connect, then small per-device
 * deltas that are merged in-memory; `onStatus` still receives a full HomeStatus
 * each time so the caller stays simple. Uses fetch (not EventSource) so it can
 * send the Authorization header. Returns an unsubscribe function.
 */
export function subscribeHomeStatus(
  onStatus: (status: HomeStatus) => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController();
  let current: HomeStatus | null = null;

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/home-status`, {
        headers: { ...authHeaders(), Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (response.status === 401) {
        forceLogout();
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(`home-status stream failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          let event = "message";
          const dataLines: string[] = [];
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }
          if (dataLines.length === 0) continue; // comment / keep-alive

          try {
            current = reduceFrame(current, event, JSON.parse(dataLines.join("")));
            if (current) onStatus(current);
          } catch {
            /* ignore a partial/garbled frame */
          }
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return () => controller.abort();
}
