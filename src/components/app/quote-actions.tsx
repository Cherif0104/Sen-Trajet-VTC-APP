"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondToQuote } from "@/server/actions/account";

export function QuoteActions({ quoteId }: { quoteId: string }) {
  const [pending, start] = useTransition();
  const respond = (decision: "accept" | "refuse") => {
    const label = decision === "accept" ? "accepter" : "refuser";
    if (!window.confirm(`Confirmez-vous vouloir ${label} ce devis ?`)) return;
    start(async () => {
      const fd = new FormData();
      fd.set("quoteId", quoteId);
      fd.set("decision", decision);
      try {
        await respondToQuote(fd);
        toast.success(decision === "accept" ? "Devis accepté. Notre équipe confirme votre réservation." : "Devis refusé.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action impossible.");
      }
    });
  };
  return (
    <>
      <Button size="sm" className="h-9 px-3" disabled={pending} onClick={() => respond("accept")}>
        <Check className="size-4" /> Accepter
      </Button>
      <Button size="sm" variant="outline" className="h-9 px-3" disabled={pending} onClick={() => respond("refuse")}>
        <X className="size-4" /> Refuser
      </Button>
    </>
  );
}
