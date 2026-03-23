"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useRequiredSession } from "@/lib/hooks/use-required-session";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeUser, hasHydrated } = useRequiredSession();

  if (!hasHydrated || !activeUser) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
