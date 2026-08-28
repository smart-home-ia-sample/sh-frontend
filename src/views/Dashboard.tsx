import { useEffect, useState } from "react";
import {
  sendDeviceCommand,
  subscribeHomeStatus,
  type DeviceStatus,
  type HomeEvent,
  type HomeStatus,
  type RoomStatus,
} from "../lib/orchestratorClient";
import { bool, clamp, deviceLabel, num, TYPE_ICON } from "../lib/deviceLabel";

type Cmd = (action: string, value?: number) => void;

function DeviceControls({ device, run }: { device: DeviceStatus; run: Cmd }) {
  const s = device.state;
  const disabled = s === null;

  const Btn = ({ children, action, value }: { children: string; action: string; value?: number }) => (
    <button type="button" disabled={disabled} onClick={() => run(action, value)}>
      {children}
    </button>
  );

  switch (device.type) {
    case "light":
      return <Btn action={bool(s, "on") ? "turn_off" : "turn_on"}>{bool(s, "on") ? "Desligar" : "Ligar"}</Btn>;
    case "dimmable_light":
      return (
        <>
          <Btn action={bool(s, "on") ? "turn_off" : "turn_on"}>{bool(s, "on") ? "Desligar" : "Ligar"}</Btn>
          <Btn action="set_brightness" value={clamp((num(s, "brightness") ?? 0) - 10, 0, 100)}>−</Btn>
          <Btn action="set_brightness" value={clamp((num(s, "brightness") ?? 0) + 10, 0, 100)}>+</Btn>
        </>
      );
    case "ac":
      return (
        <>
          <Btn action={bool(s, "on") ? "turn_off" : "turn_on"}>{bool(s, "on") ? "Desligar" : "Ligar"}</Btn>
          <Btn action="set_temperature" value={clamp((num(s, "temperature") ?? 24) - 1, 16, 30)}>−</Btn>
          <Btn action="set_temperature" value={clamp((num(s, "temperature") ?? 24) + 1, 16, 30)}>+</Btn>
        </>
      );
    case "curtain":
    case "window":
      return (
        <Btn action={bool(s, "open") ? "close" : "open"}>{bool(s, "open") ? "Fechar" : "Abrir"}</Btn>
      );
    case "door":
      return (
        <Btn action={bool(s, "locked") ? "unlock" : "lock"}>
          {bool(s, "locked") ? "Destrancar" : "Trancar"}
        </Btn>
      );
    case "alarm":
      return (
        <Btn action={bool(s, "armed") ? "disarm" : "arm"}>{bool(s, "armed") ? "Desarmar" : "Armar"}</Btn>
      );
    case "tv":
    case "coffee_maker":
    case "refrigerator":
      return <Btn action={bool(s, "on") ? "turn_off" : "turn_on"}>{bool(s, "on") ? "Desligar" : "Ligar"}</Btn>;
    default:
      return null; // motion_sensor: read-only
  }
}

function DeviceRow({
  device,
  onCommand,
}: {
  device: DeviceStatus;
  onCommand: (deviceId: string, action: string, value?: number) => Promise<void>;
}) {
  const { text, on } = deviceLabel(device.type, device.state);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run: Cmd = async (action, value) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onCommand(device.deviceId, action, value);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={busy ? "device-busy" : undefined}>
      <span className="device-name">
        {TYPE_ICON[device.type] ?? "•"} {device.nickname}
      </span>
      <span className="device-badges">
        <span className={`pill ${on ? "pill-on" : "pill-off"}`}>{text}</span>
        <span className="device-actions">
          <DeviceControls device={device} run={run} />
        </span>
      </span>
      {err && <span className="device-error">{err}</span>}
    </li>
  );
}

function RoomCard({
  room,
  onCommand,
}: {
  room: RoomStatus;
  onCommand: (deviceId: string, action: string, value?: number) => Promise<void>;
}) {
  if (room.devices.length === 0) return null;
  return (
    <div className="room">
      <h3>{room.name}</h3>
      <ul className="device-list">
        {room.devices.map((d) => (
          <DeviceRow key={d.deviceId} device={d} onCommand={onCommand} />
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "on" | "off" }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140 }}>
      <span className={`pill ${tone === "on" ? "pill-on" : tone === "off" ? "pill-off" : ""}`}>{value}</span>
      <p className="notice" style={{ marginTop: 8 }}>
        {label}
      </p>
    </div>
  );
}

function EventsCard({ events }: { events: HomeEvent[] }) {
  return (
    <section className="card">
      <h2>Eventos recentes</h2>
      {events.length === 0 ? (
        <p className="notice">Nenhum evento ainda.</p>
      ) : (
        <ul className="event-list">
          {events.map((e, i) => {
            const { text, on } = deviceLabel(e.type, e.state);
            return (
              <li key={`${e.deviceId}-${e.at}-${i}`}>
                <time className="event-time">{new Date(e.at).toLocaleTimeString()}</time>
                <span className="event-desc">
                  <strong>{e.nickname}</strong>
                  <span className={`pill ${on ? "pill-on" : "pill-off"}`}>{text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function Dashboard() {
  const [status, setStatus] = useState<HomeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // The SSE stream's first event is a full snapshot, so no separate fetch.
    const unsubscribe = subscribeHomeStatus(
      (s) => {
        if (active) {
          setStatus(s);
          setError(null);
        }
      },
      (err) => active && setError(err.message),
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (error && !status) {
    return <p className="notice notice-error">Falha ao carregar o status da casa: {error}</p>;
  }
  if (!status) {
    return <p className="notice">Carregando...</p>;
  }

  const { rollups } = status;

  const handleCommand = (deviceId: string, action: string, value?: number) =>
    sendDeviceCommand(deviceId, action, value);

  return (
    <div className="dashboard-live">
      {!status.simulatorOnline && (
        <p className="notice notice-error">
          Simulador de dispositivos offline — os estados podem estar desatualizados.
        </p>
      )}

      <div className="status-row" style={{ gap: "1rem" }}>
        <Tile
          label="Alarme"
          value={rollups.alarmArmed ? "Armado" : "Desarmado"}
          tone={rollups.alarmArmed ? "on" : "off"}
        />
        <Tile
          label="Portas"
          value={rollups.openDoors > 0 ? `${rollups.openDoors} aberta(s)` : rollups.allDoorsLocked ? "Trancadas" : "Destrancadas"}
          tone={rollups.openDoors > 0 ? "off" : "on"}
        />
        <Tile label="Consumo" value={`${rollups.totalWatts} W`} />
        <Tile label="Ativos" value={`${rollups.activeDevices}`} />
      </div>

      <section className="card">
        <h2>Ambiente</h2>
        <div className="room-grid">
          {status.rooms.map((r) => (
            <RoomCard key={r.slug} room={r} onCommand={handleCommand} />
          ))}
        </div>
      </section>

      <EventsCard events={status.events} />
    </div>
  );
}
