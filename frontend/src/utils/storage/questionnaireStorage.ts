import { localDb } from "@/src/db";
import type { AnswerMap, QuestionnaireDraft } from "@/src/types/questionnaire";

// Per-patient questionnaire drafts. A draft is the in-progress or completed
// answer set for a single assessment session. On this device only.

export function loadDraft(patientId: string): Promise<QuestionnaireDraft | null> {
  return localDb.getDraft(patientId);
}

export async function saveDraft(
  patientId: string,
  answers: AnswerMap,
  completed = false,
): Promise<boolean> {
  const now = new Date().toISOString();
  const existing = await loadDraft(patientId);
  return localDb.saveDraft({
    patientId,
    answers,
    updatedAt: now,
    completedAt: completed ? now : existing?.completedAt,
  });
}

export function clearDraft(patientId: string): Promise<boolean> {
  return localDb.clearDraft(patientId);
}
