"use client";

import { useContext } from "react";
import SidebarContext, {
  SidebarProvider,
} from "../../../context/SidebarContext";
import Sidebar from "../Sidebar";
import Header from "../Header";
import Main from "./Main";

interface DashboardShellInnerProps {
  children: React.ReactNode;
}

function DashboardShellInner({ children }: DashboardShellInnerProps) {
  const { isSidebarOpen } = useContext(SidebarContext);

  return (
    <div
      className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${
        isSidebarOpen ? "overflow-hidden" : ""
      }`}
    >
      <Sidebar />
      <div className="flex flex-col flex-1 w-full">
        <Header />
        <Main>{children}</Main>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </SidebarProvider>
  );
}
