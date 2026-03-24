import { Badge } from "@/components/ui/badge";

export function GenreBadges({ genres }: { genres: string[] }) {
  if (!genres.length) {
    return <Badge variant="outline">Genero no especificado</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {genres.slice(0, 4).map((genre) => (
        <Badge key={genre} variant="secondary" className="bg-slate-800/70 text-slate-200">
          {genre}
        </Badge>
      ))}
    </div>
  );
}
