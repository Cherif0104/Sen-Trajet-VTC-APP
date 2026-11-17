"use client";

import { Check, X } from "lucide-react";
import { ConfirmActionButton } from "@/components/app/confirm-action";
import { respondToQuote } from "@/server/actions/account";

export function QuoteActions({ quoteId }: { quoteId: string }) {
  return (
    <>
      <ConfirmActionButton
        action={respondToQuote}
        fields={{ quoteId, decision: "accept" }}
        confirm="Confirmez-vous l'acceptation de ce devis ? Notre équipe préparera ensuite votre réservation."
        size="sm"
        className="h-9 px-3"
      >
        <Check className="size-4" /> Accepter
      </ConfirmActionButton>
      <ConfirmActionButton
        action={respondToQuote}
        fields={{ quoteId, decision: "refuse" }}
        confirm="Confirmez-vous le refus de ce devis ?"
        size="sm"
        variant="outline"
        className="h-9 px-3"
      >
        <X className="size-4" /> Refuser
      </ConfirmActionButton>
    </>
  );
}
