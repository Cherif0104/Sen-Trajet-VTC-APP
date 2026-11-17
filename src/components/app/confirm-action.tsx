"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Bouton qui déclenche une Server Action (FormData) après confirmation explicite. */
export function ConfirmActionButton({
  action,
  fields,
  confirm,
  success,
  children,
  variant,
  size,
  className,
}: {
  action: (fd: FormData) => Promise<unknown>;
  fields: Record<string, string>;
  confirm?: string;
  success?: string;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      try {
        const res = (await action(fd)) as { ok?: boolean; message?: string } | undefined;
        if (res && res.ok === false) {
          toast.error(res.message ?? "Action impossible.");
          return;
        }
        setOpen(false);
        if (success || res?.message) toast.success(res?.message ?? success);
      } catch (e) {
        const digest = e && typeof e === "object" && "digest" in e ? String((e as { digest: unknown }).digest) : "";
        if (digest.startsWith("NEXT_REDIRECT")) throw e;
        toast.error(e instanceof Error && e.message ? e.message : "Action impossible.");
      }
    });

  if (!confirm)
    return (
      <Button type="button" variant={variant} size={size} className={className} disabled={pending} onClick={run}>
        {pending && <Loader2 className="size-4 animate-spin" />} {children}
      </Button>
    );

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogDescription>{confirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Annuler</Button>} />
            <Button onClick={run} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
