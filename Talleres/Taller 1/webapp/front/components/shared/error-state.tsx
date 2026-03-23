import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Unable to load data",
  description = "Please check backend availability and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="border-rose-500/20 bg-rose-950/20">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertTriangle className="h-5 w-5 text-rose-300" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-rose-100">{title}</h3>
          <p className="max-w-md text-sm text-rose-200/80">{description}</p>
        </div>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
