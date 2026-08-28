import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Assistant } from "./Assistant";
import { useAgentRun } from "../lib/AgentRunContext";

vi.mock("../lib/AgentRunContext", () => ({ useAgentRun: vi.fn() }));
const useAgentRunMock = vi.mocked(useAgentRun);

type Run = ReturnType<typeof useAgentRun>;

function stubRun(overrides: Partial<Run> = {}): Run {
  return {
    messages: [],
    events: [],
    running: false,
    sendMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as Run;
}

it("sends the trimmed text and clears the input", async () => {
  const run = stubRun();
  useAgentRunMock.mockReturnValue(run);
  render(<Assistant />);

  const user = userEvent.setup();
  const box = screen.getByPlaceholderText("Ex: Vou sair de casa.");
  await user.type(box, "  Vou dormir  ");
  await user.click(screen.getByRole("button", { name: "Enviar" }));

  expect(run.sendMessage).toHaveBeenCalledWith("Vou dormir");
  expect(box).toHaveValue("");
});

it("does nothing when the input is only whitespace", async () => {
  const run = stubRun();
  useAgentRunMock.mockReturnValue(run);
  render(<Assistant />);

  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText("Ex: Vou sair de casa."), "   ");
  await user.click(screen.getByRole("button", { name: "Enviar" }));

  expect(run.sendMessage).not.toHaveBeenCalled();
});

it("disables the form while a run is in progress", () => {
  useAgentRunMock.mockReturnValue(stubRun({ running: true }));
  render(<Assistant />);

  expect(screen.getByPlaceholderText("Ex: Vou sair de casa.")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
});

it("renders existing messages", () => {
  useAgentRunMock.mockReturnValue(
    stubRun({
      messages: [
        { id: "1", role: "user", content: "oi" },
        { id: "2", role: "assistant", content: "olá!" },
      ],
    }),
  );
  render(<Assistant />);

  expect(screen.getByText("oi")).toBeInTheDocument();
  expect(screen.getByText("olá!")).toBeInTheDocument();
});
