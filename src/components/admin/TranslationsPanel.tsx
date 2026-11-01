"use client";

import { saveTranslations } from "@/app/admin/_actions/translations";
import type { TranslatableModel } from "@/lib/translations";
import { Area, Field, Status, Submit, useFormAction } from "./kit";

export type TranslationField = { name: string; label: string; english: string; value: string; long?: boolean; hint?: string };

/** Tamil version of a record's text, shown beside its English. Blank fields show English on Tamil pages. */
export function TranslationsPanel({ model, id, fields }: { model: TranslatableModel; id: string; fields: TranslationField[] }) {
  const { state, onSubmit, pending } = useFormAction(saveTranslations.bind(null, model, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      {fields.map((f) => {
        const hint = [f.hint, f.english ? `English: ${f.english.length > 160 ? `${f.english.slice(0, 160)}…` : f.english}` : "No English text yet."].filter(Boolean).join(" ");
        return f.long ? (
          <Area key={f.name} label={`${f.label} (Tamil)`} name={f.name} lang="ta" rows={4} defaultValue={f.value} hint={hint} state={state} />
        ) : (
          <Field key={f.name} label={`${f.label} (Tamil)`} name={f.name} lang="ta" defaultValue={f.value} hint={hint} state={state} />
        );
      })}
      <Submit variant="outline" pending={pending}>Save Tamil text</Submit>
    </form>
  );
}
