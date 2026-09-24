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
  ClipboardListIcon,
} from "lucide-react";
import { ComponentType } from "react";
import { canAccessMenu, IcwRole } from "../lib/permissions";

export interface IRoute {
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  name: string;
  routes?: IRoute[];
  checkActive?: (pathname: string, route: IRoute) => boolean;
  exact?: boolean;

  /**
   * Key checked against ROLE_MENU_ACCESS in lib/permissions.ts.
   * Routes without a menuKey are visible to authenticated users.
   */
  menuKey?: string;
}

/**
 * Determines whether a route is currently active.
 */
export function routeIsActive(pathname: string, route: IRoute): boolean {
  if (route.checkActive) {
    return route.checkActive(pathname, route);
  }

  if (!route.path) {
    return false;
  }

  if (route.exact) {
    return pathname === route.path;
  }

  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}

/**
 * Filters sidebar routes based on ALL roles assigned to the authenticated user.
 *
 * A user only needs ONE of their roles to have access to a menu item.
 *
 * Example:
 *   roles: ["admin", "reviewer"]
 *
 * If admin can access "certificates", the menu is shown, even if reviewer cannot.
 *
 * This is UI-level access control only. Laravel must still enforce
 * authorization server-side.
 */
export function filterRoutesByRoles(
  routes: IRoute[],
  roles: IcwRole[] | undefined | null,
): IRoute[] {
  if (!roles || roles.length === 0) {
    return [];
  }

  return routes
    .map((route) => {
      /**
       * Parent route with children.
       *
       * We recursively filter the children and only keep the parent
       * if at least one child remains.
       */
      if (route.routes && route.routes.length > 0) {
        const filteredChildren = filterRoutesByRoles(route.routes, roles);

        if (filteredChildren.length === 0) {
          return null;
        }

        return { ...route, routes: filteredChildren };
      }

      /**
       * Normal route.
       */
      if (canAccessMenu(roles, route.menuKey)) {
        return route;
      }

      return null;
    })
    .filter((route): route is IRoute => route !== null);
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
    path: "/icw/abstract-ranking-dashboard",
    icon: ClipboardListIcon,
    name: "Abstract Ranking",
    menuKey: "abstract-ranking-dashboard",
  },
  {
    path: "/icw/abstract-review",
    icon: VoteIcon,
    name: "Review Abstract",
    menuKey: "abstract-review",
  },
  {
    path: "/icw/abstract-reviewer-dashboard",
    icon: VoteIcon,
    name: "Reviewer Dashboard",
    menuKey: "abstract-reviewer-dashboard",
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
    path: "/icw/incident-report",
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

  {
  path: "/icw/author-dashboard",
  icon: FileBadge,
  name: "My Abstracts",
  menuKey: "author-dashboard",
},
];

export default routes;