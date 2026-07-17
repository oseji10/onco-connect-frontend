import {
  LayoutDashboard,
  CalendarDays,
  BadgeCheck,
  ClipboardList,
  AlertTriangle,
  VoteIcon,
  Group,
  PenIcon,
  FileBadge,
  AwardIcon,
  UserCog,
} from "lucide-react";
import { ComponentType } from "react";
import { canAccessMenu } from "../lib/permissions";

interface IRoute {
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  name: string;
  routes?: IRoute[];
  checkActive?: (pathname: string, route: IRoute) => boolean;
  exact?: boolean;
  /** Key checked against ROLE_MENU_ACCESS in lib/permissions.ts. Omit for
   * always-visible entries (rare — most menus should carry one). */
  menuKey?: string;
}

export function routeIsActive(pathname: string, route: IRoute): boolean {
  if (route.checkActive) {
    return route.checkActive(pathname, route);
  }

  if (!route.path) return false;

  if (route.exact) {
    return pathname === route.path;
  }

  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}

/**
 * Filters the sidebar to what `role` is allowed to see. This is a UX nicety
 * only — actual enforcement happens server-side via the `role:` middleware.
 * Call this with the signed-in user's role before rendering the sidebar,
 * and guard each page itself with <RoleGuard menuKey="..."> too, since a
 * hidden menu doesn't stop someone from typing the URL directly.
 */
export function filterRoutesByRole(routes: IRoute[], role?: string): IRoute[] {
  return routes
    .filter((route) => canAccessMenu(role, route.menuKey))
    .map((route) =>
      route.routes ? { ...route, routes: filterRoutesByRole(route.routes, role) } : route
    );
}

const routes: IRoute[] = [
  {
    path: "/icw/dashboard",
    icon: LayoutDashboard,
    name: "Dashboard",
    exact: true,
    menuKey: "dashboard",
  },
  {
    path: "/icw/events",
    icon: CalendarDays,
    name: "Events",
    menuKey: "events",
  },
  {
    path: "/icw/registration",
    icon: PenIcon,
    name: "Registration",
    menuKey: "registration",
  },
  {
    path: "/icw/accreditation",
    icon: BadgeCheck,
    name: "Accreditation",
    menuKey: "accreditation",
  },
  {
    path: "/icw/abstract-management",
    icon: FileBadge,
    name: "Abstract Management",
    menuKey: "abstract-management",
  },
  {
    path: "/icw/abstract-review",
    icon: VoteIcon,
    name: "Review Abstract",
    menuKey: "abstract-review",
  },
  {
    path: "/icw/certificates",
    icon: AwardIcon,
    name: "Certificates Mgt.",
    menuKey: "certificates",
  },
  {
    path: "/icw/sponsors_and_partners",
    icon: ClipboardList,
    name: "Sponsors & Partners",
    menuKey: "sponsors",
  },
  {
    path: "/icw/speaker-management",
    icon: Group,
    name: "Speaker Management",
    menuKey: "speakers",
  },
  {
    path: "incident-report",
    icon: AlertTriangle,
    name: "Incident Reporting",
    menuKey: "incident-report",
  },
  {
    path: "/icw/users",
    icon: UserCog,
    name: "User Management",
    menuKey: "users",
  },
];

export type { IRoute };
export default routes;