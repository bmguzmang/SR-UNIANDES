import type { RecommendationEvaluation } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

const feedbackStyles: Record<
  RecommendationEvaluation["feedback"],
  { label: string; variant: "success" | "danger" | "secondary" | "outline" }
> = {
  liked: { label: "Le gusto", variant: "success" },
  disliked: { label: "No le gusto", variant: "danger" },
  not_interested: { label: "No le interesa", variant: "secondary" },
  already_seen: { label: "Ya la vio", variant: "outline" },
};

export function EvaluationHistory({
  items,
}: {
  items: RecommendationEvaluation[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evaluaciones de recomendaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const style = feedbackStyles[item.feedback] || feedbackStyles.liked;
          return (
            <div
              key={`${item.movieId}-${item.createdAt ?? item.recommendationRank ?? "na"}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-slate-950/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{item.movieTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={style.variant}>{style.label}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
