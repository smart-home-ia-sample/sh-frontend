import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import App from "./App";
import { clearToken, getToken } from "./lib/auth";

vi.mock("./lib/auth", () => ({ getToken: vi.fn(), clearToken: vi.fn() }));
vi.mock("./lib/AgentRunContext", () => ({
  AgentRunProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("./views/Login", () => ({
  Login: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess}>login-stub</button>
  ),
}));
vi.mock("./views/Dashboard", () => ({ Dashboard: () => <div>dashboard-stub</div> }));
vi.mock("./views/Assistant", () => ({ Assistant: () => <div>assistant-stub</div> }));
vi.mock("./views/AgentActivity", () => ({ AgentActivity: () => <div>activity-stub</div> }));

const getTokenMock = vi.mocked(getToken);
const clearTokenMock = vi.mocked(clearToken);

it("shows the login screen when there is no token", () => {
  getTokenMock.mockReturnValue(null);
  render(<App />);

  expect(screen.getByText("login-stub")).toBeInTheDocument();
  expect(screen.queryByText("dashboard-stub")).not.toBeInTheDocument();
});

it("shows the app shell when a token is present", () => {
  getTokenMock.mockReturnValue("jwt");
  render(<App />);

  expect(screen.getByRole("heading", { name: "Smart Home AI" })).toBeInTheDocument();
  expect(screen.getByText("dashboard-stub")).toBeInTheDocument();
  expect(screen.getByText("assistant-stub")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
});

it("logs out: clears the token and returns to the login screen", async () => {
  getTokenMock.mockReturnValue("jwt");
  render(<App />);

  await userEvent.setup().click(screen.getByRole("button", { name: "Sair" }));

  expect(clearTokenMock).toHaveBeenCalledOnce();
  expect(screen.getByText("login-stub")).toBeInTheDocument();
});

it("enters the app after a successful login", async () => {
  getTokenMock.mockReturnValue(null);
  render(<App />);

  await userEvent.setup().click(screen.getByText("login-stub"));

  expect(screen.getByText("dashboard-stub")).toBeInTheDocument();
});
