import DashboardShell from "../components/layout/DashboardShell";
import ForcePasswordChangeGuard from "../components/ForcePasswordChangeGuard";

export default function IssamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ForcePasswordChangeGuard>
      <DashboardShell>{children}</DashboardShell>
    </ForcePasswordChangeGuard>
  );
}