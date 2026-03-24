"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateUser, useLogin } from "@/lib/hooks/use-users";
import { useSessionStore } from "@/lib/store/session-store";

const createUserSchema = z.object({
  displayName: z
    .string()
    .min(2, "El nombre visible es muy corto")
    .max(60, "El nombre visible es muy largo"),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (userKey: string) => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateUserDialogProps) {
  const setActiveUser = useSessionStore((state) => state.setActiveUser);
  const createUserMutation = useCreateUser();
  const loginMutation = useLogin();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: "",
    },
  });

  async function onSubmit(values: CreateUserInput) {
    try {
      const createdUser = await createUserMutation.mutateAsync({
        displayName: values.displayName,
      });

      const loggedInUser = await loginMutation.mutateAsync({
        userKey: createdUser.userKey,
      });

      setActiveUser({
        ...createdUser,
        ...loggedInUser,
      });

      toast.success("Usuario personalizado creado", {
        description: "Continua con el onboarding calificando algunas peliculas.",
      });
      onOpenChange(false);
      form.reset();
      onCreated?.(createdUser.userKey);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el usuario personalizado.";
      toast.error("Fallo la creacion", { description: message });
    }
  }

  const pending = createUserMutation.isPending || loginMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-300" />
            Crear usuario personalizado
          </DialogTitle>
          <DialogDescription>
            Crea una identidad personalizada y agrega calificaciones iniciales para
            activar el recomendador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre visible</Label>
            <Input
              id="displayName"
              placeholder="Escribe un nombre para tu usuario personalizado"
              {...form.register("displayName")}
            />
            {form.formState.errors.displayName ? (
              <p className="text-xs text-rose-300">
                {form.formState.errors.displayName.message}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear y continuar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
