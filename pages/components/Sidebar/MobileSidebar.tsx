"use client";

import React, { useContext, useRef } from "react";
import SidebarContext from "../../../context/SidebarContext";
import SidebarContent from "./SidebarContent";

function MobileSidebar() {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const { isSidebarOpen, closeSidebar, saveScroll } =
    useContext(SidebarContext);

  const linkClickedHandler = () => {
    saveScroll(sidebarRef.current);
    closeSidebar();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        id="mobileSidebar"
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 mt-16 w-64 overflow-y-auto bg-white dark:bg-gray-800 lg:hidden transform transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isSidebarOpen}
      >
        <SidebarContent linkClicked={linkClickedHandler} />
      </aside>
    </>
  );
}

export default MobileSidebar;
