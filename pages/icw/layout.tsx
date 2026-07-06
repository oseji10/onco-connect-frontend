import DashboardShell from "../components/layout/DashboardShell";

export default function IssamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
