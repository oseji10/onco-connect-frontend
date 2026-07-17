export type IcwRole =
  | "super_admin"
  | "admin"
  | "reviewer"
  | "registration_desk_officer"
  | "participant";

/**
 * Menu keys match the `menuKey` set on each route in routes/sidebar.ts.
 * "*" means unrestricted access to every menu.
 *
 * This is UI-only. The real security boundary is the `role:` middleware
 * on the Laravel side (see backend/app/Http/Middleware/CheckRole.php) —
 * hiding a menu here never blocks a direct API call.
 */
export const ROLE_MENU_ACCESS: Record<IcwRole, string[] | "*"> = {
  super_admin: "*",
  admin: [
    "dashboard",
    "events",
    "registration",
    "accreditation",
    "abstract-management",
    "abstract-review",
    "certificates",
    "sponsors",
    "speakers",
    "incident-report",
    // "users",
    // deliberately no "users" — admin cannot see the Add User menu
  ],
  reviewer: ["abstract-review"],
  registration_desk_officer: ["registration", "accreditation"],
  // Participants use a separate, narrower participant portal (manage own
  // registration, view speakers, download own certificate) rather than
  // this staff sidebar, so nothing here maps to that admin menu set.
  participant: [],
};

export function canAccessMenu(role: string | undefined | null, menuKey?: string): boolean {
  // Routes with no menuKey (e.g. a bare divider) are always shown once authenticated.
  if (!menuKey) return true;
  if (!role) return false;

  const allowed = ROLE_MENU_ACCESS[role as IcwRole];
  if (!allowed) return false;
  if (allowed === "*") return true;

  return allowed.includes(menuKey);
}