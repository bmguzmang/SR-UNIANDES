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
import { RATING_OPTIONS } from "@/lib/constants/ratings";
import { useSessionStore } from "@/lib/store/session-store";
import { formatRating } from "@/lib/utils/format";
import type { BulkRatingEntry, UserSource } from "@/types/api";
import type { Movie } from "@/types/domain";

const createUserSchema = z.object({
  displayName: z
    .string()
    .min(2, "El nombre visible es muy corto")
    .max(60, "El nombre visible es muy largo"),
});

type Step = 1 | 2 | 3;
type CreateUserInput = z.infer<typeof createUserSchema>;
type StagedRatingEntry = BulkRatingEntry & {
  movieTitle: string;
};

export function OnboardingWizard() {
  const router = useRouter();
  const activeUser = useSessionStore((state) => state.activeUser);
  const setActiveUser = useSessionStore((state) => state.setActiveUser);
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, number>>({});
  const [stagedRatings, setStagedRatings] = useState<StagedRatingEntry[]>([]);

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
      toast.success("Usuario personalizado listo");
      setStep(2);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el usuario";
      toast.error("Fallo la creacion", { description: message });
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
      toast.success(`Calificaste ${movie.title}`, {
        description: `Se guardaron ${formatRating(rating)} estrellas`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar la calificacion";
      toast.error("Fallo la calificacion", { description: message });
    }
  }

  function stageRating(movie: Movie) {
    const rating = getDraft(movie);
    const movieTitleLabel = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    setStagedRatings((current) => {
      const rest = current.filter((entry) => entry.movieId !== movie.movieId);
      return [...rest, { movieId: movie.movieId, rating, movieTitle: movieTitleLabel }];
    });
    toast.success(`${movie.title} agregado`, {
      description: `${formatRating(rating)} estrellas se enviaran en lote.`,
    });
  }

  async function submitBulkRatings() {
    if (!activeUser || stagedRatings.length === 0) return;
    try {
      await addBulkMutation.mutateAsync({
        ratings: stagedRatings.map((entry) => ({
          movieId: entry.movieId,
          rating: entry.rating,
        })),
      });
      setStagedRatings([]);
      toast.success("Calificaciones en lote enviadas");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron enviar las calificaciones";
      toast.error("Fallo el envio en lote", { description: message });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Configuracion inicial de usuario personalizado"
        description="Crea un perfil, agrega calificaciones y genera recomendaciones personalizadas."
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
                {item === 1 && "Crear usuario"}
                {item === 2 && "Calificar peliculas"}
                {item === 3 && "Finalizar"}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Crear identidad personalizada</CardTitle>
            <CardDescription>
              Este usuario se guardara como cuenta personalizada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:max-w-md"
              onSubmit={form.handleSubmit(handleCreateUser)}
            >
              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre visible</Label>
                <Input
                  id="displayName"
                  placeholder="Tu nombre"
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
                    Creando...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Crear y continuar
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
            <CardTitle>Buscar y calificar peliculas</CardTitle>
            <CardDescription>
              Agrega al menos algunas calificaciones para que el recomendador tenga senal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por titulo..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            {moviesQuery.isError ? (
              <ErrorState
                description="Fallo la busqueda de peliculas. Verifica el backend `/api/v1/movies`."
                onRetry={() => {
                  void moviesQuery.refetch();
                }}
              />
            ) : null}
            {searchQuery.trim().length > 0 && moviesQuery.data?.length === 0 && !moviesQuery.isLoading ? (
              <EmptyState
                title="No se encontraron peliculas"
                description="Prueba una busqueda mas amplia, por ejemplo: `toy`, `matrix`, `star`."
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
                          </div>
                          <GenreBadges genres={movie.genres} />
                          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                            <div className="space-y-1">
                              <Label>Calificacion</Label>
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
                                  {RATING_OPTIONS.map((option) => (
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
                              Guardar ahora
                            </Button>
                            <Button
                              onClick={() => stageRating(movie)}
                              disabled={!activeUser}
                            >
                              <Plus className="h-4 w-4" />
                              {stagedValue ? "Actualizar lote" : "Agregar a lote"}
                            </Button>
                          </div>
                          {stagedValue ? (
                            <p className="text-xs text-sky-200">
                              Calificacion en lote: {formatRating(stagedValue)}
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
                Calificaciones existentes: <span className="font-semibold text-foreground">{existingRatingsCount}</span> |
                En lote: <span className="font-semibold text-foreground">{stagedRatings.length}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setStep(3)}
                  disabled={totalPreparedRatings < 3}
                >
                  Continuar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Finalizar configuracion</CardTitle>
            <CardDescription>
              Envia las calificaciones en lote y abre recomendaciones personalizadas.
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
                    <span>{entry.movieTitle}</span>
                    <span className="font-semibold">{formatRating(entry.rating)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No hay calificaciones en lote"
                description="Igual puedes continuar si ya calificaste peliculas con Guardar ahora."
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
              >
                Atras
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
                    Enviando...
                  </>
                ) : (
                  "Enviar calificaciones en lote"
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                disabled={totalPreparedRatings < 3}
              >
                <CheckCircle2 className="h-4 w-4" />
                Abrir recomendaciones
              </Button>
            </div>
            {totalPreparedRatings < 3 ? (
              <p className="text-xs text-amber-300">
                Agrega al menos 3 calificaciones para un mejor primer lote de recomendaciones.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
