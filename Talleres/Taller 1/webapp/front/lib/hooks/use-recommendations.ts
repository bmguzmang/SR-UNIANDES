"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  RecommendationEvaluationRequest,
} from "@/types/api";
import {
  getRecommendationEvaluations,
  getRecommendationExplanation,
  getRecommendations,
  submitRecommendationEvaluation,
} from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/hooks/query-keys";

interface UseRecommendationsParams {
  userKey?: string;
  topN?: number;
  excludeRated?: boolean;
  includeExplanationPreview?: boolean;
  enabled?: boolean;
}

export function useRecommendations(params: UseRecommendationsParams) {
  const userKey = params.userKey;
  const topN = params.topN ?? 10;
  const excludeRated = params.excludeRated ?? true;
  const includeExplanationPreview = params.includeExplanationPreview ?? true;
  const enabled = params.enabled ?? true;

  return useQuery({
    queryKey: queryKeys.recommendations(
      userKey ?? "unknown",
      topN,
      excludeRated,
      includeExplanationPreview,
    ),
    queryFn: () =>
      getRecommendations({
        userKey: userKey as string,
        topN,
        excludeRated,
        includeExplanationPreview,
      }),
    enabled: enabled && Boolean(userKey),
  });
}

export function useRecommendationExplanation(userKey?: string, movieId?: number) {
  return useQuery({
    queryKey: queryKeys.explanation(userKey ?? "unknown", movieId ?? 0),
    queryFn: () => getRecommendationExplanation(userKey as string, movieId as number),
    enabled: Boolean(userKey && movieId),
  });
}

export function useRecommendationEvaluations(userKey?: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.evaluations(userKey ?? "unknown", limit),
    queryFn: () => getRecommendationEvaluations(userKey as string, limit),
    enabled: Boolean(userKey),
  });
}

export function useSubmitRecommendationEvaluation(userKey?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecommendationEvaluationRequest) =>
      submitRecommendationEvaluation(payload),
    onSuccess: () => {
      if (!userKey) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations(userKey, 50),
      });
    },
  });
}
