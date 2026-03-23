"use client";

import { useQuery } from "@tanstack/react-query";
import { getHealth, getSystemInfo } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: queryKeys.systemInfo,
    queryFn: getSystemInfo,
  });
}
