import type { RecommendationExplanation } from "@/types/domain";
import { formatRating } from "@/lib/utils/format";

export function buildNarrative(explanation: RecommendationExplanation): string {
  if (explanation.narrative) return explanation.narrative;

  const topNeighbors = explanation.neighbors
    .filter((item) => item.userRating && item.userRating >= 4)
    .slice(0, 3);
  const evidenceMovies = topNeighbors.map((item) => item.title).join(", ");

  if (topNeighbors.length > 0) {
    return `Como este usuario califico alto peliculas similares (${evidenceMovies}), el modelo item-item de Pearson espera una coincidencia fuerte para ${explanation.movie.title}. La evidencia principal viene de peliculas vecinas con alta similitud y calificaciones positivas del usuario.`;
  }

  return `Esta recomendacion esta impulsada por filtrado colaborativo item-item con similitud de Pearson. El modelo encontro peliculas vecinas cercanas a ${explanation.movie.title} y proyecto una calificacion estimada de ${formatRating(explanation.predictedRating)} para este usuario.`;
}
