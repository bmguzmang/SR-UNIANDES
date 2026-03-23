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
      toast.success(`Welcome ${user.displayName}`);
      router.push(redirectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error("Could not log in", { description: message });
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
                Cinematic Recommendation Intelligence
              </h1>
              <p className="text-sm leading-relaxed text-slate-300">
                Item-item collaborative filtering with Pearson similarity
                (Surprise KNNWithMeans). Explore users, ratings, recommendations,
                and interpretable evidence in one premium demo workspace.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-400/20 bg-slate-900/45 p-4 text-sm">
              <p className="font-medium text-slate-100">System status</p>
              <p className="text-slate-300">
                Health:{" "}
                <span className="font-semibold text-emerald-300">
                  {healthQuery.data?.status ?? "unknown"}
                </span>
              </p>
              <p className="text-slate-300">
                Model:{" "}
                <span className="font-semibold text-slate-100">
                  {systemInfo.data?.modelName ?? "KNNWithMeans item-item"}
                </span>
              </p>
            </div>

            {activeUser ? (
              <div className="rounded-xl border border-sky-300/20 bg-sky-500/10 p-4 text-sm">
                <p className="font-medium text-sky-100">
                  Session detected: {activeUser.displayName}
                </p>
                <Button className="mt-3" onClick={() => router.push("/dashboard")}>
                  Continue to Dashboard
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-slate-950/55">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Choose an identity</h2>
                <p className="text-sm text-muted-foreground">
                  Search existing MovieLens users or create a new custom user.
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                Create Custom User
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search users (e.g. ml_42)"
                  className="pl-9"
                />
              </div>
              <Select value={source} onValueChange={(value) => setSource(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="movielens">MovieLens</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usersQuery.isLoading ? <LoadingGrid count={6} /> : null}

            {usersQuery.isError ? (
              <ErrorState
                description="User listing failed. Verify `/api/v1/users` in backend."
                onRetry={() => {
                  void usersQuery.refetch();
                }}
              />
            ) : null}

            {!usersQuery.isLoading && usersQuery.data?.length === 0 ? (
              <EmptyState
                title="No users found"
                description="Adjust the search term or create a custom user to continue."
                action={
                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                    Create user
                  </Button>
                }
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

      <CreateUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          router.push("/users/new");
        }}
      />
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
