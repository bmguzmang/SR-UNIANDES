import { useState } from "react";
import type { UserRating } from "@/types/domain";
import { GenreBadges } from "@/components/shared/genre-badges";
import { MoviePoster } from "@/components/shared/movie-poster";
import { RatingPill } from "@/components/shared/rating-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

interface RatingsHistoryTableProps {
  ratings: UserRating[];
  sort: string;
  onSortChange: (value: string) => void;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export function RatingsHistoryTable({
  ratings,
  sort,
  onSortChange,
}: RatingsHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const totalPages = Math.max(1, Math.ceil(ratings.length / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, ratings.length);
  const paginatedRatings = ratings.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Ratings History</CardTitle>
        <Select
          value={sort}
          onValueChange={(value) => {
            setCurrentPage(1);
            onSortChange(value);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="rating_desc">Highest ratings</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Movie</TableHead>
              <TableHead>Genres</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRatings.map((row) => (
              <TableRow key={`${row.movieId}-${row.timestamp}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <MoviePoster
                      title={row.movieTitle}
                      image={row.movieImage}
                      className="h-16 w-11 shrink-0 rounded-md"
                      showFallbackLabel={false}
                    />
                    <div>
                      <p className="font-medium">{row.movieTitle}</p>
                      <p className="text-xs text-muted-foreground">movieId: {row.movieId}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <GenreBadges genres={row.genres} />
                </TableCell>
                <TableCell>
                  <RatingPill rating={row.rating} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(row.timestamp)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {ratings.length === 0
              ? "No ratings to show"
              : `Showing ${startIndex + 1}-${endIndex} of ${ratings.length}`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(value) => {
                setRowsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[76px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="min-w-16 text-center text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
