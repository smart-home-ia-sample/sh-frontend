import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentRunProvider, useAgentRun } from "./AgentRunContext";
import { createAgent } from "./orchestratorClient";
import { forceLogout } from "./auth";

vi.mock("./orchestratorClient", () => ({ createAgent: vi.fn() }));
vi.mock("./auth", () => ({ forceLogout: vi.fn() }));

const createAgentMock = vi.mocked(createAgent);
const forceLogoutMock = vi.mocked(forceLogout);

// A stand-in for @ag-ui/client's HttpAgent. `runImpl` decides what the run does.
function fakeAgent(runImpl: (h: Record<string, (p: { event: unknown }) => void>) => Promise<void> | void) {
  const agent = {
    handlers: {} as Record<string, (p: { event: unknown }) => void>,
    subscribe(h: Record<string, (p: { event: unknown }) => void>) {
      agent.handlers = h;
      return { unsubscribe: vi.fn() };
    },
    addMessage: vi.fn(),
    runAgent: vi.fn(async () => {
      await runImpl(agent.handlers);
    }),
  };
  return agent;
}

function Harness() {
  const { messages, events, running, sendMessage } = useAgentRun();
  return (
    <div>
      <span data-testid="running">{String(running)}</span>
      <button onClick={() => void sendMessage("oi").catch(() => undefined)}>send</button>
      <ul data-testid="messages">
        {messages.map((m) => (
          <li key={m.id}>{`${m.role}:${m.content}`}</li>
        ))}
      </ul>
      <ol data-testid="events">
        {events.map((e) => (
          <li key={e.id}>{e.detail ? `${e.label} (${e.detail})` : e.label}</li>
        ))}
      </ol>
    </div>
  );
}

const renderWithProvider = () =>
  render(
    <AgentRunProvider>
      <Harness />
    </AgentRunProvider>,
  );

it("throws if useAgentRun is used outside a provider", () => {
  // Silence the React error-boundary console noise for this expected throw.
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  expect(() => render(<Harness />)).toThrow(/AgentRunProvider/);
  spy.mockRestore();
});

it("streams a run: user + assistant messages, activity events, running toggles", async () => {
  const agent = fakeAgent((h) => {
    h.onRunStartedEvent?.({ event: {} });
    h.onStepStartedEvent?.({ event: { stepName: "interpret" } });
    h.onStepFinishedEvent?.({ event: { stepName: "interpret" } });
    h.onToolCallStartEvent?.({ event: { toolCallName: "security" } });
    h.onToolCallResultEvent?.({ event: { toolCallId: "tc1", content: "ok" } });
    h.onTextMessageStartEvent?.({ event: { messageId: "a1" } });
    h.onTextMessageContentEvent?.({ event: { messageId: "a1", delta: "Casa " } });
    h.onTextMessageContentEvent?.({ event: { messageId: "a1", delta: "segura." } });
    h.onRunFinishedEvent?.({ event: {} });
  });
  createAgentMock.mockReturnValue(agent as unknown as ReturnType<typeof createAgent>);

  renderWithProvider();
  await userEvent.setup().click(screen.getByRole("button", { name: "send" }));

  await vi.waitFor(() => {
    expect(screen.getByTestId("messages")).toHaveTextContent("user:oi");
    expect(screen.getByTestId("messages")).toHaveTextContent("assistant:Casa segura.");
  });
  expect(agent.addMessage).toHaveBeenCalledWith(
    expect.objectContaining({ role: "user", content: "oi" }),
  );
  const events = screen.getByTestId("events").textContent ?? "";
  expect(events).toContain("Execução iniciada");
  expect(events).toContain("Etapa: interpret (iniciada)");
  expect(events).toContain("Chamando agente: security");
  expect(events).toContain("Execução concluída");
  expect(screen.getByTestId("running")).toHaveTextContent("false");
});

it("calls forceLogout when the run fails with a 401", async () => {
  const agent = fakeAgent(() => {
    throw new Error("request failed 401");
  });
  createAgentMock.mockReturnValue(agent as unknown as ReturnType<typeof createAgent>);

  renderWithProvider();
  await userEvent.setup().click(screen.getByRole("button", { name: "send" }));

  await vi.waitFor(() => expect(forceLogoutMock).toHaveBeenCalledOnce());
  expect(screen.getByTestId("running")).toHaveTextContent("false");
});
