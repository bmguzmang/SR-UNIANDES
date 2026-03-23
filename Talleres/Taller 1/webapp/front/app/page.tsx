"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/store/session-store";

export default function HomePage() {
  const router = useRouter();
  const activeUser = useSessionStore((state) => state.activeUser);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (activeUser) {
      router.replace("/dashboard");
      return;
    }
    router.replace("/login");
  }, [activeUser, hasHydrated, router]);

  return null;
}
