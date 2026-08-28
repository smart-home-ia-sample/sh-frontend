import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";
import { login } from "../lib/auth";

vi.mock("../lib/auth", () => ({ login: vi.fn() }));
const loginMock = vi.mocked(login);

beforeEach(() => {
  loginMock.mockReset();
});

it("submits the trimmed username and password, then calls onSuccess", async () => {
  loginMock.mockResolvedValue(undefined);
  const onSuccess = vi.fn();
  render(<Login onSuccess={onSuccess} />);

  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Usuário"));
  await user.type(screen.getByLabelText("Usuário"), "  demo  ");
  await user.type(screen.getByLabelText("Senha"), "s3cret");
  await user.click(screen.getByRole("button", { name: "Entrar" }));

  expect(loginMock).toHaveBeenCalledWith("demo", "s3cret");
  expect(onSuccess).toHaveBeenCalledOnce();
});

it("shows the error message and does not call onSuccess when login fails", async () => {
  loginMock.mockRejectedValue(new Error("Usuário ou senha inválidos."));
  const onSuccess = vi.fn();
  render(<Login onSuccess={onSuccess} />);

  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Senha"), "wrong");
  await user.click(screen.getByRole("button", { name: "Entrar" }));

  expect(await screen.findByText("Usuário ou senha inválidos.")).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
});

it("defaults the username field to 'demo'", () => {
  render(<Login onSuccess={vi.fn()} />);
  expect(screen.getByLabelText("Usuário")).toHaveValue("demo");
});
