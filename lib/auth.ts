const TOKEN_KEY = "csr_token";

export type IcwRole =
  | "super_admin"
  | "admin"
  | "reviewer"
  | "registration_desk_officer"
  | "abstract_committee_member"
  | "author"
  | "participant";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Decode JWT payload.
 *
 * This is only used to read the token on the frontend.
 * It does NOT verify the JWT signature.
 */
function decodeTokenPayload(
  token: string
): Record<string, any> | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      normalized.length +
        ((4 - (normalized.length % 4)) % 4),
      "="
    );

    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map(
          (c) =>
            "%" +
            c.charCodeAt(0)
              .toString(16)
              .padStart(2, "0")
        )
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Returns all roles assigned to the authenticated user.
 *
 * New JWT format:
 *
 * {
 *   "roles": [
 *     "admin",
 *     "reviewer"
 *   ]
 * }
 *
 * For backwards compatibility, if the backend still sends
 * the old single "role" property, it is converted into
 * a one-item array.
 */
export function getRoles(): IcwRole[] {
  const token = getToken();

  if (!token) {
    return [];
  }

  const payload = decodeTokenPayload(token);

  if (!payload) {
    return [];
  }

  // New multiple-role JWT format
  if (Array.isArray(payload.roles)) {
    return payload.roles.filter(
      (role: unknown): role is IcwRole =>
        typeof role === "string"
    );
  }

  // Backwards compatibility with old single-role JWT
  if (typeof payload.role === "string") {
    return [payload.role as IcwRole];
  }

  return [];
}

/**
 * Backwards-compatible helper.
 *
 * Existing parts of the application that still call getRole()
 * will continue to work.
 *
 * For new code, use getRoles().
 */
export function getRole(): IcwRole | null {
  const roles = getRoles();

  return roles.length > 0 ? roles[0] : null;
}

export function getFacilityId(): number | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  return decodeTokenPayload(token)?.facilityId ?? null;
}

export function getMustChangePassword(): boolean {
  const token = getToken();

  if (!token) {
    return false;
  }

  return Boolean(
    decodeTokenPayload(token)?.mustChangePassword
  );
}
