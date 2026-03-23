"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Plus, Search, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { GenreBadges } from "@/components/shared/genre-badges";
import { MoviePoster } from "@/components/shared/movie-poster";
import { SectionHeader } from "@/components/shared/section-header";
import { useMoviesSearch } from "@/lib/hooks/use-movies";
import { useAddUserRating, useAddUserRatingsBulk, useCreateUser, useLogin, useUserRatings } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";
import { formatRating } from "@/lib/utils/format";
import type { BulkRatingEntry, UserSource } from "@/types/api";
import type { Movie } from "@/types/domain";

const createUserSchema = z.object({
  displayName: z.string().min(2).max(60),
});

type Step = 1 | 2 | 3;
type CreateUserInput = z.infer<typeof createUserSchema>;

const ratingOptions = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

export function OnboardingWizard() {
  const router = useRouter();
  const activeUser = useSessionStore((state) => state.activeUser);
  const setActiveUser = useSessionStore((state) => state.setActiveUser);
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, number>>({});
  const [stagedRatings, setStagedRatings] = useState<BulkRatingEntry[]>([]);

  const createUserMutation = useCreateUser();
  const loginMutation = useLogin();
  const addUserRatingMutation = useAddUserRating(activeUser?.userKey);
  const addBulkMutation = useAddUserRatingsBulk(activeUser?.userKey);
  const ratingsQuery = useUserRatings({
    userKey: activeUser?.userKey,
    sort: "recent",
    limit: 200,
  });
  const moviesQuery = useMoviesSearch({
    query: deferredSearch,
    limit: 12,
  });

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: "",
    },
  });

  const existingRatingsCount = ratingsQuery.data?.length ?? 0;
  const totalPreparedRatings = existingRatingsCount + stagedRatings.length;

  const stagedMap = useMemo(
    () =>
      new Map(stagedRatings.map((entry) => [entry.movieId, entry.rating])),
    [stagedRatings],
  );

  async function handleCreateUser(values: CreateUserInput) {
    try {
      const createdUser = await createUserMutation.mutateAsync({
        displayName: values.displayName,
      });
      const loggedIn = await loginMutation.mutateAsync({
        userKey: createdUser.userKey,
      });
      setActiveUser({
        ...createdUser,
        ...loggedIn,
        source: (createdUser.source || "custom") as UserSource,
      });
      toast.success("Custom user ready");
      setStep(2);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create user";
      toast.error("Creation failed", { description: message });
    }
  }

  function setMovieDraft(movieId: number, rating: number) {
    setRatingDrafts((current) => ({ ...current, [movieId]: rating }));
  }

  function getDraft(movie: Movie) {
    return ratingDrafts[movie.movieId] ?? 4;
  }

  async function saveSingleRating(movie: Movie) {
    if (!activeUser) return;
    const rating = getDraft(movie);
    try {
      await addUserRatingMutation.mutateAsync({
        movieId: movie.movieId,
        rating,
        timestamp: Math.floor(Date.now() / 1000),
      });
      toast.success(`Rated ${movie.title}`, {
        description: `Saved ${formatRating(rating)} stars`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save rating";
      toast.error("Rating failed", { description: message });
    }
  }

  function stageRating(movie: Movie) {
    const rating = getDraft(movie);
    setStagedRatings((current) => {
      const rest = current.filter((entry) => entry.movieId !== movie.movieId);
      return [...rest, { movieId: movie.movieId, rating }];
    });
    toast.success(`${movie.title} staged`, {
      description: `${formatRating(rating)} stars will be submitted in bulk.`,
    });
  }

  async function submitBulkRatings() {
    if (!activeUser || stagedRatings.length === 0) return;
    try {
      await addBulkMutation.mutateAsync({ ratings: stagedRatings });
      setStagedRatings([]);
      toast.success("Bulk ratings submitted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not submit ratings";
      toast.error("Bulk submission failed", { description: message });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Custom User Onboarding"
        description="Create a profile, add ratings, and generate personalized recommendations."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Card
            key={item}
            className={item <= step ? "border-sky-300/30 bg-sky-500/10" : ""}
          >
            <CardContent className="flex items-center gap-2 py-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold">
                {item}
              </span>
              <span className="text-sm">
                {item === 1 && "Create user"}
                {item === 2 && "Rate movies"}
                {item === 3 && "Finalize"}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Custom Identity</CardTitle>
            <CardDescription>
              This user will be stored as a custom account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:max-w-md"
              onSubmit={form.handleSubmit(handleCreateUser)}
            >
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  {...form.register("displayName")}
                />
                {form.formState.errors.displayName ? (
                  <p className="text-xs text-rose-300">
                    {form.formState.errors.displayName.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" disabled={createUserMutation.isPending || loginMutation.isPending}>
                {createUserMutation.isPending || loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Create and Continue
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Search and Rate Movies</CardTitle>
            <CardDescription>
              Add at least a few ratings so the recommender has signal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            {moviesQuery.isError ? (
              <ErrorState
                description="Movie search failed. Verify backend `/api/v1/movies`."
                onRetry={() => {
                  void moviesQuery.refetch();
                }}
              />
            ) : null}
            {searchQuery.trim().length > 0 && moviesQuery.data?.length === 0 && !moviesQuery.isLoading ? (
              <EmptyState
                title="No movies found"
                description="Try a broader query, e.g. `toy`, `matrix`, `star`."
              />
            ) : null}
            <div className="grid gap-3 lg:grid-cols-2">
              {moviesQuery.data?.map((movie) => {
                const draft = getDraft(movie);
                const stagedValue = stagedMap.get(movie.movieId);
                return (
                  <Card key={movie.movieId} className="border-border/50 bg-slate-950/40">
                    <CardContent className="py-4">
                      <div className="grid gap-3 sm:grid-cols-[88px_1fr]">
                        <MoviePoster
                          title={movie.title}
                          image={movie.image}
                          className="aspect-[2/3] w-full max-w-[88px] rounded-lg"
                          showFallbackLabel={false}
                        />
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium">
                              {movie.title}
                              {movie.year ? ` (${movie.year})` : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">movieId: {movie.movieId}</p>
                          </div>
                          <GenreBadges genres={movie.genres} />
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                            <div className="space-y-1">
                              <Label>Rating</Label>
                              <Select
                                value={String(draft)}
                                onValueChange={(value) =>
                                  setMovieDraft(movie.movieId, Number(value))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ratingOptions.map((option) => (
                                    <SelectItem key={option} value={String(option)}>
                                      {formatRating(option)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => {
                                void saveSingleRating(movie);
                              }}
                              disabled={addUserRatingMutation.isPending || !activeUser}
                            >
                              Save now
                            </Button>
                            <Button
                              onClick={() => stageRating(movie)}
                              disabled={!activeUser}
                            >
                              <Plus className="h-4 w-4" />
                              {stagedValue ? "Update stage" : "Stage"}
                            </Button>
                          </div>
                          {stagedValue ? (
                            <p className="text-xs text-sky-200">
                              Staged rating: {formatRating(stagedValue)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-slate-900/50 p-3">
              <p className="text-sm text-muted-foreground">
                Existing ratings: <span className="font-semibold text-foreground">{existingRatingsCount}</span> |
                Staged for bulk: <span className="font-semibold text-foreground">{stagedRatings.length}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setStep(3)}
                  disabled={totalPreparedRatings < 3}
                >
                  Continue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Finalize Setup</CardTitle>
            <CardDescription>
              Submit staged ratings in bulk and open personalized recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stagedRatings.length > 0 ? (
              <div className="grid gap-2">
                {stagedRatings.map((entry) => (
                  <div
                    key={entry.movieId}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-slate-900/60 px-3 py-2 text-sm"
                  >
                    <span>movieId: {entry.movieId}</span>
                    <span className="font-semibold">{formatRating(entry.rating)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No staged ratings"
                description="You can still continue if you already rated movies with Save now."
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  void submitBulkRatings();
                }}
                disabled={stagedRatings.length === 0 || addBulkMutation.isPending}
              >
                {addBulkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Staged Ratings"
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                disabled={totalPreparedRatings < 3}
              >
                <CheckCircle2 className="h-4 w-4" />
                Open Recommendations
              </Button>
            </div>
            {totalPreparedRatings < 3 ? (
              <p className="text-xs text-amber-300">
                Add at least 3 ratings for a better first recommendation batch.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
