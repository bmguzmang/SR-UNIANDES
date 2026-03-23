import type { RecommendationExplanation } from "@/types/domain";
import { formatRating } from "@/lib/utils/format";

export function buildNarrative(explanation: RecommendationExplanation): string {
  if (explanation.narrative) return explanation.narrative;

  const topNeighbors = explanation.neighbors
    .filter((item) => item.userRating && item.userRating >= 4)
    .slice(0, 3);
  const evidenceMovies = topNeighbors.map((item) => item.title).join(", ");

  if (topNeighbors.length > 0) {
    return `Because this user rated similar movies highly (${evidenceMovies}), the item-item Pearson model expects a strong match for ${explanation.movie.title}. The strongest evidence comes from neighboring movies with high similarity and positive user ratings.`;
  }

  return `This recommendation is driven by item-item collaborative filtering with Pearson similarity. The model found neighboring movies close to ${explanation.movie.title} and projected a predicted rating of ${formatRating(explanation.predictedRating)} for this user.`;
}
