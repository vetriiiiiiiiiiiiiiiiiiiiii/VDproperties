"use client";

import { useRef } from "react";
import { askProjectQuestion } from "@/app/account/_actions/customer";
import { Area, Status, Submit, useFormAction } from "@/components/admin/kit";

export function QuestionForm({ projectId }: { projectId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useFormAction(async (prev, fd) => {
    const r = await askProjectQuestion(projectId, prev, fd);
    if (r.ok) ref.current?.reset();
    return r;
  });
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <Status state={state} />
      <Area label="Ask a question" name="body" rows={3} state={state} />
      <Submit pending={pending}>Send question</Submit>
    </form>
  );
}
