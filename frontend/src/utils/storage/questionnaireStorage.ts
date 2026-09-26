import { storage } from "@/src/utils/storage";
import type { AnswerMap, QuestionnaireDraft } from "@/src/types/questionnaire";

// Per-patient questionnaire drafts. A draft is the in-progress or completed
// answer set for a single assessment session. On this device only.

const draftKey = (patientId: string) => `oa-risk-detector/questionnaire/${patientId}`;

export async function loadDraft(patientId: string): Promise<QuestionnaireDraft | null> {
  const draft = await storage.getItem<QuestionnaireDraft | null>(draftKey(patientId), null);
  return draft ?? null;
}

export async function saveDraft(
  patientId: string,
  answers: AnswerMap,
  completed = false,
): Promise<boolean> {
  const now = new Date().toISOString();
  const existing = await loadDraft(patientId);
  const draft: QuestionnaireDraft = {
    patientId,
    answers,
    updatedAt: now,
    completedAt: completed ? now : existing?.completedAt,
  };
  return storage.setItem(draftKey(patientId), draft);
}

export async function clearDraft(patientId: string): Promise<boolean> {
  return storage.removeItem(draftKey(patientId));
}
