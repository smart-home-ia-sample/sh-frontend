import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "./Dashboard";
import type { HomeStatus } from "../lib/orchestratorClient";
import { sendDeviceCommand, subscribeHomeStatus } from "../lib/orchestratorClient";

vi.mock("../lib/orchestratorClient", () => ({
  subscribeHomeStatus: vi.fn(),
  sendDeviceCommand: vi.fn().mockResolvedValue(undefined),
}));

const subscribeMock = vi.mocked(subscribeHomeStatus);
const sendCommandMock = vi.mocked(sendDeviceCommand);

type Handlers = { onStatus: (s: HomeStatus) => void; onError: (e: Error) => void };

/** Render Dashboard and hand back the callbacks it passed to subscribeHomeStatus. */
function renderDashboard(): Handlers {
  let handlers: Handlers;
  subscribeMock.mockImplementation((onStatus, onError) => {
    handlers = { onStatus, onError };
    return vi.fn();
  });
  render(<Dashboard />);
  return handlers!;
}

const STATUS: HomeStatus = {
  simulatorOnline: true,
  rooms: [
    {
      slug: "kitchen",
      name: "Cozinha",
      devices: [
        { deviceId: "k-light", nickname: "Luz da cozinha", type: "light", state: { on: false } },
        { deviceId: "k-door", nickname: "Porta", type: "door", state: { locked: true, open: false } },
      ],
    },
    { slug: "empty", name: "Vazio", devices: [] },
  ],
  rollups: { alarmArmed: true, allDoorsLocked: true, openDoors: 0, totalWatts: 120, activeDevices: 3 },
  events: [
    { deviceId: "k-light", nickname: "Luz da cozinha", type: "light", state: { on: true }, at: 1717000000000 },
  ],
};

it("shows a loading notice until the first status arrives", () => {
  renderDashboard();
  expect(screen.getByText("Carregando...")).toBeInTheDocument();
});

it("renders rooms, devices, rollup tiles and the events feed from a snapshot", () => {
  const { onStatus } = renderDashboard();
  act(() => onStatus(STATUS));

  expect(screen.getByText("Cozinha")).toBeInTheDocument();
  expect(screen.getByText("Luz da cozinha")).toBeInTheDocument();
  expect(screen.queryByText("Vazio")).not.toBeInTheDocument(); // empty room is skipped

  expect(screen.getByText("Armado")).toBeInTheDocument(); // alarm tile
  expect(screen.getByText("120 W")).toBeInTheDocument(); // consumption tile
  expect(screen.getByText("Eventos recentes")).toBeInTheDocument();
});

it("sends the matching command when a device button is clicked", async () => {
  const { onStatus } = renderDashboard();
  act(() => onStatus(STATUS));

  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Ligar" })); // light is off
  expect(sendCommandMock).toHaveBeenCalledWith("k-light", "turn_on", undefined);

  await user.click(screen.getByRole("button", { name: "Destrancar" })); // door is locked
  expect(sendCommandMock).toHaveBeenCalledWith("k-door", "unlock", undefined);
});

it("renders controls for every device type and issues the right verbs", async () => {
  const { onStatus } = renderDashboard();
  act(() =>
    onStatus({
      ...STATUS,
      rooms: [
        {
          slug: "all",
          name: "Todos",
          devices: [
            { deviceId: "dl", nickname: "Abajur", type: "dimmable_light", state: { on: true, brightness: 50 } },
            { deviceId: "ac", nickname: "Ar", type: "ac", state: { on: true, temperature: 22 } },
            { deviceId: "cur", nickname: "Cortina", type: "curtain", state: { open: false } },
            { deviceId: "win", nickname: "Janela", type: "window", state: { open: true } },
            { deviceId: "alm", nickname: "Alarme", type: "alarm", state: { armed: false } },
            { deviceId: "tv", nickname: "TV", type: "tv", state: { on: false } },
            { deviceId: "cof", nickname: "Cafeteira", type: "coffee_maker", state: { on: true } },
            { deviceId: "mot", nickname: "Sensor", type: "motion_sensor", state: { active: true } },
          ],
        },
      ],
    }),
  );

  const user = userEvent.setup();

  await user.click(screen.getAllByRole("button", { name: "Desligar" })[0]); // dimmable on -> off
  expect(sendCommandMock).toHaveBeenCalledWith("dl", "turn_off", undefined);

  await user.click(screen.getAllByRole("button", { name: "+" })[0]); // brightness +10 -> 60
  expect(sendCommandMock).toHaveBeenCalledWith("dl", "set_brightness", 60);

  await user.click(screen.getAllByRole("button", { name: "−" })[1]); // ac temp -1 -> 21
  expect(sendCommandMock).toHaveBeenCalledWith("ac", "set_temperature", 21);

  await user.click(screen.getByRole("button", { name: "Abrir" })); // curtain closed -> open
  expect(sendCommandMock).toHaveBeenCalledWith("cur", "open", undefined);

  await user.click(screen.getByRole("button", { name: "Fechar" })); // window open -> close
  expect(sendCommandMock).toHaveBeenCalledWith("win", "close", undefined);

  await user.click(screen.getByRole("button", { name: "Armar" })); // alarm disarmed -> arm
  expect(sendCommandMock).toHaveBeenCalledWith("alm", "arm", undefined);

  // motion_sensor is read-only: no button, just a status pill
  expect(screen.getByText("Presença")).toBeInTheDocument();
});

it("surfaces a stream error when there is no status yet", () => {
  const { onError } = renderDashboard();
  act(() => onError(new Error("boom")));
  expect(screen.getByText(/Falha ao carregar o status da casa: boom/)).toBeInTheDocument();
});

it("warns when the simulator is offline", () => {
  const { onStatus } = renderDashboard();
  act(() => onStatus({ ...STATUS, simulatorOnline: false }));
  expect(screen.getByText(/Simulador de dispositivos offline/)).toBeInTheDocument();
});
