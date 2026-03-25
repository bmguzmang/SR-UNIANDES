"use client";

import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { UserCard } from "@/components/users/user-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingGrid } from "@/components/shared/loading-grid";
import { useHealth, useSystemInfo } from "@/lib/hooks/use-system";
import { useLogin, useUsersSearch } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";
import type { UserSource } from "@/types/api";
import type { UserSummary } from "@/types/domain";

function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setActiveUser = useSessionStore((state) => state.setActiveUser);
  const activeUser = useSessionStore((state) => state.activeUser);
  const loginMutation = useLogin();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [source, setSource] = useState<UserSource>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const usersQuery = useUsersSearch({
    query: deferredQuery,
    source,
    limit: 20,
  });
  const healthQuery = useHealth();
  const systemInfo = useSystemInfo();

  const redirectPath = useMemo(() => {
    const redirect = searchParams.get("redirect");
    if (!redirect || !redirect.startsWith("/")) return "/dashboard";
    return redirect;
  }, [searchParams]);

  async function handleLogin(user: UserSummary) {
    try {
      const loggedIn = await loginMutation.mutateAsync({ userKey: user.userKey });
      setActiveUser({ ...user, ...loggedIn });
      toast.success(`Bienvenido ${user.displayName}`);
      router.push(redirectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fallo de inicio de sesion";
      toast.error("No se pudo iniciar sesion", { description: message });
    }
  }

  return (
    <main className="min-h-screen p-4 lg:p-8">
      <div className="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-[440px_1fr]">
        <Card className="overflow-hidden border-slate-500/20 bg-cinematic-gradient">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs text-sky-200">
                <Sparkles className="h-3.5 w-3.5" />
                CineMatch Intelligence
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
                Inteligencia de recomendacion cinematica
              </h1>
              <p className="text-sm leading-relaxed text-slate-300">
                Filtrado colaborativo item-item con similitud de Pearson
                (Surprise KNNWithMeans). Explora usuarios, calificaciones, recomendaciones,
                y evidencia interpretable en un unico espacio de demo premium.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-400/20 bg-slate-900/45 p-4 text-sm">
              <p className="font-medium text-slate-100">Estado del sistema</p>
              <p className="text-slate-300">
                Salud:{" "}
                <span className="font-semibold text-emerald-300">
                  {healthQuery.data?.status ?? "desconocido"}
                </span>
              </p>
              <p className="text-slate-300">
                Modelo:{" "}
                <span className="font-semibold text-slate-100">
                  {systemInfo.data?.modelName ?? "KNNWithMeans item-item"}
                </span>
              </p>
            </div>

            {activeUser ? (
              <div className="rounded-xl border border-sky-300/20 bg-sky-500/10 p-4 text-sm">
                <p className="font-medium text-sky-100">
                  Sesion detectada: {activeUser.displayName}
                </p>
                <Button className="mt-3" onClick={() => router.push("/dashboard")}>
                  Continuar al panel
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-slate-950/55">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Elige una identidad</h2>
                <p className="text-sm text-muted-foreground">
                  Busca usuarios existentes de MovieLens o crea un usuario personalizado nuevo.
                </p>
              </div>
              {!activeUser ? (
                <Button onClick={() => setDialogOpen(true)}>
                  Crear usuario personalizado
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar usuarios por nombre"
                  className="pl-9"
                />
              </div>
              <Select value={source} onValueChange={(value) => setSource(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los origenes</SelectItem>
                  <SelectItem value="movielens">MovieLens</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usersQuery.isLoading ? <LoadingGrid count={6} /> : null}

            {usersQuery.isError ? (
              <ErrorState
                description="Fallo el listado de usuarios. Verifica `/api/v1/users` en el backend."
                onRetry={() => {
                  void usersQuery.refetch();
                }}
              />
            ) : null}

            {!usersQuery.isLoading && usersQuery.data?.length === 0 ? (
              <EmptyState
                title="No se encontraron usuarios"
                description="Ajusta la busqueda o crea un usuario personalizado para continuar."
                action={!activeUser ? (
                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                    Crear usuario
                  </Button>
                ) : undefined}
              />
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              {usersQuery.data?.map((user) => (
                <UserCard
                  key={user.userKey}
                  user={user}
                  onLogin={(selectedUser) => {
                    void handleLogin(selectedUser);
                  }}
                  loading={loginMutation.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {!activeUser ? (
        <CreateUserDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={() => {
            router.push("/users/new");
          }}
        />
      ) : null}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-8" />}>
      <LoginScreen />
    </Suspense>
  );
}

