"use client";

import { useActionState } from "react";
import { FileInput } from "@/components/file-input";
import { FormMessage, SelectField, SubmitButton, TextField } from "@/components/forms";
import { uploadSubmissionDocument } from "@/server/actions/owner";
import { initialState } from "@/lib/action-state";
import { DOC_TYPES } from "@/lib/domain";

export function DocumentUploadForm({ submissionId, defaultType }: { submissionId: string; defaultType?: string }) {
  const [state, action] = useActionState(uploadSubmissionDocument, initialState);
  return (
    <form action={action} className="grid gap-4" key={state.ok ? `ok-${state.message}-${Date.now()}` : "form"} noValidate>
      <input type="hidden" name="submissionId" value={submissionId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Type de document"
          name="docType"
          options={DOC_TYPES.filter((d) => ["carte_grise", "assurance", "visite_technique", "photo", "piece_identite", "autre"].includes(d.value))}
          defaultValue={defaultType ?? "carte_grise"}
        />
        <TextField label="Date d'expiration" name="expiresAt" type="date" hint="Pour l'assurance et la visite technique" />
      </div>
      <FileInput name="file" label="Fichier" required hint="PDF, JPG, PNG ou WebP — 3,5 Mo maximum" />
      <div>
        <SubmitButton pendingLabel="Envoi…">Ajouter le document</SubmitButton>
      </div>
    </form>
  );
}
