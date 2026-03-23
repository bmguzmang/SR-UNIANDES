import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <Card className="bg-slate-950/45">
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        <div className="rounded-lg border border-border/60 bg-slate-900 p-2">
          <Icon className="h-5 w-5 text-slate-300" />
        </div>
      </CardContent>
    </Card>
  );
}
