"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RecommendationItem } from "@/types/domain";
import type { RecommendationFeedback } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoviePoster } from "@/components/shared/movie-poster";
import { useSubmitRecommendationEvaluation } from "@/lib/hooks/use-recommendations";
import { useSessionStore } from "@/lib/store/session-store";

const evaluationSchema = z.object({
  feedback: z.enum(["liked", "disliked", "not_interested", "already_seen"]),
  actualRating: z
    .union([
      z.string().length(0),
      z.coerce
        .number()
        .min(0.5, "La calificacion minima es 0.5")
        .max(5, "La calificacion maxima es 5"),
    ])
    .optional(),
});

type EvaluationInput = z.infer<typeof evaluationSchema>;

interface EvaluationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendation: RecommendationItem | null;
}

const feedbackLabels: Record<RecommendationFeedback, string> = {
  liked: "Le gusto",
  disliked: "No le gusto",
  not_interested: "No le interesa",
  already_seen: "Ya la vi",
};

export function EvaluationDialog({
  open,
  onOpenChange,
  recommendation,
}: EvaluationDialogProps) {
  const activeUser = useSessionStore((state) => state.activeUser);
  const evaluationMutation = useSubmitRecommendationEvaluation(activeUser?.userKey);
  const [feedbackValue, setFeedbackValue] =
    useState<EvaluationInput["feedback"]>("liked");

  const form = useForm<EvaluationInput>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      feedback: "liked",
      actualRating: "",
    },
  });

  async function onSubmit(values: EvaluationInput) {
    if (!activeUser || !recommendation) return;
    try {
      const normalizedPredictedRating =
        recommendation.predictedRating >= 0.5 && recommendation.predictedRating <= 5
          ? recommendation.predictedRating
          : null;
      const normalizedRecommendationRank =
        recommendation.rank >= 1 ? recommendation.rank : null;

      await evaluationMutation.mutateAsync({
        userKey: activeUser.userKey,
        movieId: recommendation.movieId,
        predictedRating: normalizedPredictedRating,
        recommendationRank: normalizedRecommendationRank,
        feedback: values.feedback,
        actualRating:
          typeof values.actualRating === "number"
            ? values.actualRating
            : null,
      });
      toast.success("Evaluacion guardada");
      onOpenChange(false);
      form.reset();
      setFeedbackValue("liked");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo enviar la evaluacion";
      toast.error("Fallo el envio", { description: message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evaluar recomendacion</DialogTitle>
          <DialogDescription>
            Registra feedback cualitativo para {recommendation?.title || "esta pelicula"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-slate-900/60 p-3">
            <div className="flex items-center gap-3">
              <MoviePoster
                title={recommendation?.title ?? "Pelicula"}
                image={recommendation?.image}
                className="h-16 w-11 shrink-0 rounded-md"
                showFallbackLabel={false}
              />
              <div>
                <p className="text-sm font-medium">
                  {recommendation?.title}
                  {recommendation?.year ? ` (${recommendation.year})` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Puntaje estimado: {recommendation ? recommendation.predictedRating.toFixed(2) : "N/D"}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Opinion</Label>
            <Select
              value={feedbackValue}
              onValueChange={(value) => {
                const typedValue = value as EvaluationInput["feedback"];
                setFeedbackValue(typedValue);
                form.setValue("feedback", typedValue);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(feedbackLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="actualRating">Calificacion real (opcional)</Label>
            <Input
              id="actualRating"
              type="number"
              min={0.5}
              max={5}
              step={0.5}
              placeholder="4.5"
              {...form.register("actualRating")}
            />
            {form.formState.errors.actualRating ? (
              <p className="text-xs text-rose-300">
                {form.formState.errors.actualRating.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={evaluationMutation.isPending || !recommendation}>
              {evaluationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {feedbackValue === "liked" ? (
                    <ThumbsUp className="h-4 w-4" />
                  ) : (
                    <ThumbsDown className="h-4 w-4" />
                  )}
                  Enviar evaluacion
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
