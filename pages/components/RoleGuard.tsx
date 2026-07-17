"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessMenu } from "../../lib/permissions";
import { getRole } from "../../lib/auth"; // adjust import path to wherever your project's getRole() lives

/**
 * Wrap any page that maps to a sidebar menuKey with this. Hiding the sidebar
 * entry (routes/sidebar.ts) only affects what's shown — someone can still
 * type the URL directly, so every gated page needs this too. The Laravel
 * `role:` middleware is what actually blocks the underlying API calls.
 *
 * Usage:
 *   <RoleGuard menuKey="users"><UsersManagementPage /></RoleGuard>
 */
export default function RoleGuard({
  menuKey,
  children,
}: {
  menuKey: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const role = getRole();

    if (!canAccessMenu(role, menuKey)) {
      setAllowed(false);
      router.replace("/icw/dashboard");
      return;
    }

    setAllowed(true);
  }, [menuKey, router]);

  if (allowed !== true) return null;

  return <>{children}</>;
}