import {
  LayoutDashboard,
  CalendarDays,
  BadgeCheck,
  BedDouble,
  ClipboardList,
  UtensilsCrossed,
  AlertTriangle,
  ForkKnife,
  VoteIcon,
  TabletIcon,
  SyringeIcon,
  DoorOpenIcon,
  Group,
  GroupIcon,
  StethoscopeIcon,
  PenIcon,
  ComputerIcon,
  Badge,
  FileBadge,
  AwardIcon,
  
} from "lucide-react";
import { ComponentType } from "react";

interface IRoute {
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  name: string;
  routes?: IRoute[];
  checkActive?: (pathname: string, route: IRoute) => boolean;
  exact?: boolean;
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

const routes: IRoute[] = [
  {
    path: "/icw/dashboard",
    icon: LayoutDashboard,
    name: "Dashboard",
    exact: true,
  },
  {
    path: "/icw/events",
    icon: CalendarDays,
    name: "Events",
  },

  //  {
  //   icon: PenIcon,
  //   name: "Registration Mgt.",
  //   routes: [
  //     {
  //       path: "/icw/events",
  //       name: "Register New",
  //     },
  //     {
  //       path: "/icw/color-groups",
  //       name: "Registered Participants",
  //     },
  //   ],
  // },

  // {
  //   icon: ComputerIcon,
  //   name: "Accreditation Mgt.",
  //   routes: [
  //     {
  //       path: "/icw/events",
  //       name: "New Accreditation",
  //     },
  //     {
  //       path: "/icw/color-groups",
  //       name: "Accredited Participants",
  //     },
  //   ],
  // },

  //  {
  //   path: "/icw/color-groups",
  //   icon: GroupIcon,
  //   name: "Color Groups",
  // },
  {
    path: "/icw/registration",
    icon: PenIcon,
    name: "Registration",
  },
    {
    path: "/icw/accreditation",
    icon: BadgeCheck,
    name: "Accreditation",
  },

  //   {
  //   path: "/icw/resources",
  //   icon: BadgeCheck,
  //   name: "Resource Mgt.",
  // },

  {
    path: "/icw/abstract-management",
    icon: FileBadge,
    name: "Abstract Management",
  },

  {
    path: "/icw/abstract-review",
    icon: VoteIcon,
    name: "Review Abstract",
  },

  {
    path: "/icw/certificates",
    icon: AwardIcon,
    name: "Certificates Mgt.",
  },
  {
    path: "/icw/sponsors_and_partners",
    icon: ClipboardList,
    name: "Sponsors & Partners",
  },
  // {
  //   path: "/icw/scanner",
  //   icon: UtensilsCrossed,
  //   name: "Meal Service",
  // },
  // {
  //   path: "/icw/meal",
  //   icon: ForkKnife,
  //   name: "Meal Management",
  // },

  // {
  //   path: "/icw/medication",
  //   icon: SyringeIcon,
  //   name: "Medicals",
  // },

  // {
  //   path: "/icw/medical-info",
  //   icon: StethoscopeIcon,
  //   name: "Medical Info",
  // },

  //  {
  //   path: "/icw/exitlogs",
  //   icon: DoorOpenIcon,
  //   name: "Exit Management",
  // },

  {
    path: "incident-report",
    icon: AlertTriangle,
    name: "Incident Reporting",
  },
];

export type { IRoute };
export default routes;
