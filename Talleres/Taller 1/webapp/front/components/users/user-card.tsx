import { UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserSummary } from "@/types/domain";
import { formatRating, formatSource } from "@/lib/utils/format";

interface UserCardProps {
  user: UserSummary;
  onLogin: (user: UserSummary) => void;
  loading?: boolean;
}

export function UserCard({ user, onLogin, loading }: UserCardProps) {
  return (
    <Card className="transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-glow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-border/70 bg-slate-900 p-2">
              <UserCircle2 className="h-4 w-4 text-slate-200" />
            </div>
            <div>
              <CardTitle className="text-base">{user.displayName}</CardTitle>
              <p className="text-xs text-muted-foreground">{user.userKey}</p>
            </div>
          </div>
          <Badge variant="outline">{formatSource(user.source)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-900/70 p-2">
          <p className="text-xs text-muted-foreground">Ratings</p>
          <p className="text-sm font-semibold">{user.ratingCount}</p>
        </div>
        <div className="rounded-lg bg-slate-900/70 p-2">
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-sm font-semibold">{formatRating(user.averageRating)}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={() => onLogin(user)} disabled={loading} className="w-full">
          Log In as This User
        </Button>
      </CardFooter>
    </Card>
  );
}
