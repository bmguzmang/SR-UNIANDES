import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="container flex min-h-screen items-center justify-center py-10">
      <Card className="max-w-lg">
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-2xl font-semibold">Pagina no encontrada</h1>
          <p className="text-sm text-muted-foreground">
            El recurso solicitado no existe en las rutas de este frontend.
          </p>
          <Button asChild>
            <Link href="/dashboard">Volver al panel</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
