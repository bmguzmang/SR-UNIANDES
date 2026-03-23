export function normalizeGenres(input?: string | string[] | null): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.filter(Boolean).map((genre) => genre.trim());
  }

  return input
    .split("|")
    .map((genre) => genre.trim())
    .filter(Boolean)
    .filter((genre) => genre.toLowerCase() !== "(no genres listed)");
}

export function extractYearFromTitle(title?: string | null): number | null {
  if (!title) return null;
  const match = title.match(/\((\d{4})\)$/);
  if (!match) return null;
  return Number(match[1]);
}

export function cleanMovieTitle(title?: string | null): string {
  if (!title) return "Unknown title";
  return title.replace(/\s\(\d{4}\)$/, "").trim();
}

export function formatRating(value?: number | null, fallback = "N/A"): string {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value.toFixed(2);
}

export function formatCompactNumber(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

export function formatDate(value?: string | number | null): string {
  if (!value) return "Unknown";
  const parsed =
    typeof value === "number"
      ? new Date(value * 1000)
      : new Date(value.toString());

  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function formatSource(source?: string): string {
  if (!source) return "Unknown source";
  if (source === "movielens") return "MovieLens";
  if (source === "custom") return "Custom";
  return source;
}

export function ratingTone(value: number): "positive" | "neutral" | "negative" {
  if (value >= 4) return "positive";
  if (value <= 2.5) return "negative";
  return "neutral";
}
