"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/session-store";

export function useRequiredSession() {
  const router = useRouter();
  const pathname = usePathname();
  const activeUser = useSessionStore((state) => state.activeUser);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !activeUser) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [activeUser, hasHydrated, pathname, router]);

  return {
    activeUser,
    hasHydrated,
  };
}
