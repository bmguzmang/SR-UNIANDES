"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Gauge, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Panel", icon: Gauge },
  { href: "/movies", label: "Peliculas", icon: Compass },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-border/60 bg-slate-950/60 p-4 md:block">
      <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col">
        <div className="rounded-xl border border-border/60 bg-cinematic-gradient p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-400/20 p-2 text-sky-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">CineMatch Intelligence</p>
              <p className="text-xs text-slate-300">Estudio de Recomendacion</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-300/90">
            Filtrado colaborativo item-item con similitud de Pearson usando KNNWithMeans.
          </p>
          <Badge variant="outline" className="mt-3 border-sky-300/30 bg-sky-400/10 text-sky-200">
            MovieLens 20M
          </Badge>
        </div>

        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground",
                  active && "bg-accent text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
