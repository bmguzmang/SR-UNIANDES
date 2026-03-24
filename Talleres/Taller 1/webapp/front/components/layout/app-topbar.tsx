"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSystemInfo } from "@/lib/hooks/use-system";
import { useLogout } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";
import { formatSource } from "@/lib/utils/format";

export function AppTopbar() {
  const router = useRouter();
  const activeUser = useSessionStore((state) => state.activeUser);
  const clearActiveUser = useSessionStore((state) => state.clearActiveUser);
  const logoutMutation = useLogout();
  const systemInfo = useSystemInfo();

  const initials = activeUser?.displayName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore logout errors and clear local session for demo continuity.
    } finally {
      clearActiveUser();
      toast.success("Sesion cerrada");
      router.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <div className="hidden md:block">
          <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-200">
            {systemInfo.data?.modelName ?? "KNNWithMeans item-item"}
          </Badge>
        </div>
        <div className="relative ml-auto hidden w-full max-w-sm md:block">
        </div>
        <div className="md:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/movies">Peliculas</Link>
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-slate-900/60 px-2 py-1.5 text-left hover:bg-slate-800/60">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials || <UserCircle2 className="h-4 w-4" />}</AvatarFallback>
              </Avatar>
              <span className="hidden text-xs md:block">
                <span className="block max-w-[140px] truncate font-medium">
                  {activeUser?.displayName || "Invitado"}
                </span>
                <span className="block text-muted-foreground">
                  {formatSource(activeUser?.source)}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Panel</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void handleLogout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
