"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Heart, Loader2, Sparkle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EvaluationHistory } from "@/components/dashboard/evaluation-history";
import { RatingsHistoryTable } from "@/components/dashboard/ratings-history-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingGrid } from "@/components/shared/loading-grid";
import { SectionHeader } from "@/components/shared/section-header";
import { EvaluationDialog } from "@/components/recommendations/evaluation-dialog";
import { RecommendationCard } from "@/components/recommendations/recommendation-card";
import { useRecommendationEvaluations, useRecommendations } from "@/lib/hooks/use-recommendations";
import { useSystemInfo } from "@/lib/hooks/use-system";
import { useUserProfile, useUserRatings } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";
import { formatRating } from "@/lib/utils/format";
import type { RecommendationItem } from "@/types/domain";

function computeTopGenres(genres: string[][]): string[] {
  const counter = new Map<string, number>();
  genres.flat().forEach((genre) => {
    counter.set(genre, (counter.get(genre) ?? 0) + 1);
  });
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);
}

export default function DashboardPage() {
  const router = useRouter();
  const activeUser = useSessionStore((state) => state.activeUser);
  const [ratingsSort, setRatingsSort] = useState("recent");
  const [topN, setTopN] = useState(6);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<RecommendationItem | null>(null);
  const [evaluationOpen, setEvaluationOpen] = useState(false);

  const profileQuery = useUserProfile(activeUser?.userKey);
  const ratingsQuery = useUserRatings({
    userKey: activeUser?.userKey,
    sort: ratingsSort,
    limit: 10,
  });
  const evaluationsQuery = useRecommendationEvaluations(activeUser?.userKey, 50);
  const activeUserKey = activeUser?.userKey;
  const recommendationsQuery = useRecommendations({
    userKey: activeUserKey,
    topN,
    excludeRated: true,
    includeExplanationPreview: true,
  });

  const recommendations = recommendationsQuery.data?.recommendations ?? [];
  const ratings = ratingsQuery.data ?? [];
  const profile = profileQuery.data;

  const topGenres =
    profile?.favoriteGenres.length
      ? profile.favoriteGenres.slice(0, 3)
      : computeTopGenres(ratings.map((item) => item.genres));

  const avgRating = ratings.length
    ? ratings.reduce((acc, item) => acc + item.rating, 0) / ratings.length
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="User ratings"
          value={`${profile?.ratingCount ?? ratings.length}`}
          helper="Historical interactions"
          icon={BarChart3}
        />
        <StatCard
          label="Average rating"
          value={formatRating(avgRating)}
          helper="Taste intensity"
          icon={Star}
        />
        <StatCard
          label="Top genres"
          value={topGenres.length ? topGenres.join(" · ") : "N/A"}
          helper="Preference profile"
          icon={Heart}
        />
        <Card className="bg-slate-950/45">
          <CardContent className="flex h-full items-center justify-between py-5">
            <div>
              <p className="text-xs text-muted-foreground">Top N</p>
              <Select
                value={String(topN)}
                onValueChange={(value) => setTopN(Number(value))}
              >
                <SelectTrigger className="mt-1 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 12, 18, 24].map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Recommendation batch size
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionHeader
          title="Top Recommendations"
          description="Predicted by item-item Pearson collaborative filtering."
        />
        {recommendationsQuery.isPending && recommendations.length === 0 ? (
          <LoadingGrid count={6} />
        ) : null}
        {recommendationsQuery.isError && recommendations.length === 0 ? (
          <ErrorState
            description="Recommendation request failed. Verify `/api/v1/recommendations`."
          />
        ) : null}
        {!recommendationsQuery.isFetching &&
        !recommendationsQuery.isPending &&
        !recommendationsQuery.isError &&
        recommendations.length === 0 ? (
          <EmptyState
            title="No recommendations yet"
            description="Generate a batch or add more ratings to the active profile."
          />
        ) : null}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 2xl:grid-cols-6">
          {recommendations.map((item) => (
            <RecommendationCard
              key={item.movieId}
              recommendation={item}
              onViewExplanation={(recommendation) =>
                router.push(`/recommendations/${recommendation.movieId}`)
              }
              onEvaluate={(recommendation) => {
                setSelectedRecommendation(recommendation);
                setEvaluationOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <RatingsHistoryTable
          ratings={ratings}
          sort={ratingsSort}
          onSortChange={(value) => setRatingsSort(value)}
        />
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Evaluation History"
          description="Explicit user feedback on delivered recommendations."
        />
        {evaluationsQuery.isLoading ? <LoadingGrid count={2} /> : null}
        {evaluationsQuery.data?.length ? (
          <EvaluationHistory items={evaluationsQuery.data} />
        ) : null}
        {!evaluationsQuery.isLoading && !evaluationsQuery.data?.length ? (
          <EmptyState
            title="No evaluations yet"
            description="Use Evaluate on recommendation cards to record outcomes."
          />
        ) : null}
      </section>

      <EvaluationDialog
        open={evaluationOpen}
        onOpenChange={setEvaluationOpen}
        recommendation={selectedRecommendation}
      />
    </div>
  );
}
