const TOKEN_KEY = "csr_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function logout() {
  if (typeof window !== "undefined") {
    // was removing "token" — the actual key is TOKEN_KEY ("csr_token"),
    // so this previously left the token in place after "logout".
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Decodes a JWT payload with no external library. The backend's
 * getJWTCustomClaims() (App\Models\User) puts the role name directly on
 * the token — 'role' => $this->roleName — so this reads it straight off,
 * no extra API round trip.
 */
function decodeTokenPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  const token = getToken();
  if (!token) return null;
  return decodeTokenPayload(token)?.role ?? null;
}

export function getFacilityId(): number | null {
  const token = getToken();
  if (!token) return null;
  return decodeTokenPayload(token)?.facilityId ?? null;
}

export function getMustChangePassword(): boolean {
  const token = getToken();
  if (!token) return false;
  return Boolean(decodeTokenPayload(token)?.mustChangePassword);
}