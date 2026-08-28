import { render, screen } from "@testing-library/react";
import { AgentActivity } from "./AgentActivity";
import { useAgentRun } from "../lib/AgentRunContext";

vi.mock("../lib/AgentRunContext", () => ({ useAgentRun: vi.fn() }));
const useAgentRunMock = vi.mocked(useAgentRun);

type Run = ReturnType<typeof useAgentRun>;
const run = (events: Run["events"]): Run =>
  ({ messages: [], events, running: false, sendMessage: vi.fn() }) as Run;

it("prompts the user when there are no events", () => {
  useAgentRunMock.mockReturnValue(run([]));
  render(<AgentActivity />);
  expect(screen.getByText(/Nenhuma execução ainda/)).toBeInTheDocument();
});

it("renders the timeline with labels and details", () => {
  useAgentRunMock.mockReturnValue(
    run([
      { id: "1", label: "Execução iniciada", timestamp: 1717000000000 },
      { id: "2", label: "Etapa: interpret", detail: "concluída", timestamp: 1717000001000 },
    ]),
  );
  render(<AgentActivity />);

  expect(screen.getByText("Execução iniciada")).toBeInTheDocument();
  expect(screen.getByText("Etapa: interpret")).toBeInTheDocument();
  expect(screen.getByText("concluída")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});
