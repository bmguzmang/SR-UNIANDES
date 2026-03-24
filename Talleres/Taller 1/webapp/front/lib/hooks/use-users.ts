"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddRatingRequest,
  AddRatingsBulkRequest,
  CreateUserRequest,
  LoginRequest,
  UserSource,
} from "@/types/api";
import {
  addUserRating,
  addUserRatingsBulk,
  createUser,
  getUser,
  getUserRatings,
  login,
  logout,
  searchUsers,
} from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useUsersSearch(params: { query?: string; source?: UserSource; limit?: number }) {
  const query = params.query ?? "";
  const source = params.source ?? "all";
  const limit = params.limit ?? 20;
  return useQuery({
    queryKey: queryKeys.users(query, source, limit),
    queryFn: () => searchUsers({ query, source, limit }),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: logout,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserRequest) => createUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUserProfile(userKey?: string) {
  return useQuery({
    queryKey: queryKeys.user(userKey ?? "unknown"),
    queryFn: () => getUser(userKey as string),
    enabled: Boolean(userKey),
  });
}

export function useUserRatings(params: {
  userKey?: string;
  sort?: "recent" | "rating_desc" | string;
  limit?: number;
}) {
  const userKey = params.userKey;
  const sort = params.sort ?? "recent";
  const limit = params.limit ?? 50;
  return useQuery({
    queryKey: queryKeys.userRatings(userKey ?? "unknown", sort, limit),
    queryFn: () =>
      getUserRatings({
        userKey: userKey as string,
        sort,
        limit,
      }),
    enabled: Boolean(userKey),
  });
}

export function useAddUserRating(userKey?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddRatingRequest) => addUserRating(userKey as string, payload),
    onSuccess: () => {
      if (!userKey) return;
      void queryClient.invalidateQueries({ queryKey: ["user-ratings", userKey] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(userKey) });
      void queryClient.invalidateQueries({ queryKey: ["recommendations", userKey] });
    },
  });
}

export function useAddUserRatingsBulk(userKey?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddRatingsBulkRequest) => addUserRatingsBulk(userKey as string, payload),
    onSuccess: () => {
      if (!userKey) return;
      void queryClient.invalidateQueries({ queryKey: ["user-ratings", userKey] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(userKey) });
      void queryClient.invalidateQueries({ queryKey: ["recommendations", userKey] });
    },
  });
}
