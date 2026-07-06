"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useState } from "react";
import { LogOut } from "lucide-react";
import SidebarContext from "../../../context/SidebarContext";
import routes, { IRoute, routeIsActive } from "../../../routes/sidebar";
import SidebarSubmenu from "./SidebarSubmenu";
import Image from "next/image";

interface SidebarContentProps {
  linkClicked?: () => void;
}

export default function SidebarContent({ linkClicked }: SidebarContentProps) {
  const pathname = usePathname();
  const { closeSidebar, saveScroll } = useContext(SidebarContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const safeRoutes = routes.filter((route): route is IRoute => Boolean(route));

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken");

      // Optional backend logout call
      if (token) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          console.error("Backend logout failed:", error);
        }
      }

      // Clear storage
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("authUser");

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("authUser");

      // Optional: clear everything if your auth is fully client-side
      // localStorage.clear();
      // sessionStorage.clear();

      // Hard redirect works better for logout flows
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Check console for details.");
      setIsLoggingOut(false);
    }
  }

  function handleLinkClick(listEl: HTMLElement | null) {
    saveScroll(listEl);

    if (linkClicked) {
      linkClicked();
    } else {
      closeSidebar();
    }
  }

  // const Icon = route.icon;

  return (
    <div className="py-4 text-black dark:text-gray-400 flex flex-col h-full justify-between">
      <div>
        <Link
          href="/issam"
          className="text-left ml-6 text-lg font-bold text-gray-800 dark:text-gray-200"
          onClick={(e) => {
            const listEl = e.currentTarget.closest("ul") as HTMLElement | null;
            handleLinkClick(listEl);
          }}
        >
          <Image
            src="/assets/img/onco-connect.svg"
            alt="OncoConnect Logo"
            width={350}
            height={150}
            className="object-contain"
            priority
          />
        </Link>

        <ul id="sidebar" className="mt-6 flex-1 text-left">
          {safeRoutes.map((route) => {
            if (route.routes && route.routes.length > 0) {
              return (
                <SidebarSubmenu
                  key={route.name}
                  route={route}
                  linkClicked={linkClicked || closeSidebar}
                />
              );
            }

            if (!route.path) return null;

            const active = routeIsActive(pathname, route);
            const Icon = route.icon; // ✅ Move it here, inside the map

            return (
              <li className="relative px-6 py-3 text-left" key={route.name}>
                {active && (
                  <span
                    className="absolute inset-y-0 text-left w-1 bg-purple-600 rounded-tr-lg rounded-br-lg "
                    aria-hidden="true"
                  />
                )}

                <Link
                  href={route.path}
                  className={`text-left flex items-center gap-3 w-full text-sm font-semibold transition-colors duration-150 hover:text-green-700 dark:hover:text-green-400 ${
                    active ? "text-left text-black dark:text-white" : ""
                  }`}
                  onClick={(e) => {
                    const listEl = e.currentTarget.closest(
                      "ul",
                    ) as HTMLElement | null;
                    handleLinkClick(listEl);
                  }}
                >
                  {Icon && <Icon className="w-5 h-5 text-green-700" />}
                  <span>{route.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="px-6 pb-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-semibold rounded-lg bg-red-700 text-white hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <LogOut className="w-4 h-4 mr-3" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </div>
  );
}
