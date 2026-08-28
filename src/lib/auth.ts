const TOKEN_KEY = "bff.access_token";

let cached: string | null = readToken();

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return cached;
}

export function setToken(token: string): void {
  cached = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode / storage disabled — token still lives in memory for this tab */
  }
}

export function clearToken(): void {
  cached = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function authHeaders(): Record<string, string> {
  return cached ? { Authorization: `Bearer ${cached}` } : {};
}

/** Drop the token and bounce to the login screen. Called on any 401 from the BFF. */
export function forceLogout(): void {
  clearToken();
  window.location.reload();
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Usuário ou senha inválidos." : `Falha no login (${res.status}).`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Resposta de login sem token.");
  }
  setToken(data.access_token);
}
