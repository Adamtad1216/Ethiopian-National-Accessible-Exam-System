const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

const ACCESS_TOKEN_KEY = "enaes_access_token";
const REFRESH_TOKEN_KEY = "enaes_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  retryOnAuthFail?: boolean;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const payload = (await response.json()) as { accessToken: string };
  const currentRefresh = getRefreshToken();
  if (!currentRefresh) {
    return false;
  }

  setTokens(payload.accessToken, currentRefresh);
  return true;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    skipAuth = false,
    retryOnAuthFail = true,
    headers,
    ...rest
  } = options;
  const accessToken = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
      ...(skipAuth || !accessToken
        ? {}
        : { Authorization: `Bearer ${accessToken}` }),
    },
  });

  if (response.status === 401 && !skipAuth && retryOnAuthFail) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnAuthFail: false });
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      payload.message ?? `Request failed with ${response.status}`,
    );
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
