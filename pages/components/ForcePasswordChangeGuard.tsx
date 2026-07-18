"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMustChangePassword } from "../../lib/auth";

// Pages a must_change_password=true user is allowed to be on without
// getting bounced. Keep this in sync with EnsurePasswordChanged's
// exempt route names on the backend — they're enforcing the same rule
// from two different layers (UX here, real security there).
const EXEMPT_PATHS = ["/icw/change-password", "/icw/login-otp", "/"];

/**
 * Wrap this around the authenticated app shell (wherever Sidebar + Header
 * live — e.g. app/icw/layout.tsx), NOT around individual pages. It needs
 * to run on every authenticated route, not just the gated ones RoleGuard
 * already covers.
 */
export default function ForcePasswordChangeGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (EXEMPT_PATHS.includes(pathname)) {
      setChecked(true);
      return;
    }

    if (getMustChangePassword()) {
      router.replace("/icw/change-password");
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;

  return <>{children}</>;
}