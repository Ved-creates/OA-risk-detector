import type { LocalDb } from "@/src/db/types";
import type { Assessment, FrameSample } from "@/src/types/assessment";
import type { Patient } from "@/src/types/patient";
import type { QuestionnaireDraft } from "@/src/types/questionnaire";
import { storage } from "@/src/utils/storage";

// Web preview fallback: the same LocalDb contract on AsyncStorage. The
// production Android/iOS app uses expo-sqlite (db/index.ts).

const PATIENTS_KEY = "oa-risk-detector/patients";
const ASSESSMENTS_KEY = "oa-risk-detector/assessments";
const draftKey = (patientId: string) => `oa-risk-detector/questionnaire/${patientId}`;
const framesKey = (assessmentId: string) => `oa-risk-detector/frames/${assessmentId}`;

async function list<T>(key: string): Promise<T[]> {
  return (await storage.getItem<T[]>(key, [])) ?? [];
}

export const localDb: LocalDb = {
  engine: "async-storage",

  getPatients: () => list<Patient>(PATIENTS_KEY),
  savePatient: async (patient) => {
    const patients = await list<Patient>(PATIENTS_KEY);
    return storage.setItem(PATIENTS_KEY, [patient, ...patients.filter((p) => p.patientId !== patient.patientId)]);
  },

  getDraft: async (patientId) => (await storage.getItem<QuestionnaireDraft | null>(draftKey(patientId), null)) ?? null,
  saveDraft: (draft) => storage.setItem(draftKey(draft.patientId), draft),
  clearDraft: (patientId) => storage.removeItem(draftKey(patientId)),

  getAssessments: () => list<Assessment>(ASSESSMENTS_KEY),
  getAssessment: async (assessmentId) => (await list<Assessment>(ASSESSMENTS_KEY)).find((a) => a.assessmentId === assessmentId) ?? null,
  saveAssessment: async (assessment) => {
    const all = await list<Assessment>(ASSESSMENTS_KEY);
    return storage.setItem(ASSESSMENTS_KEY, [assessment, ...all.filter((a) => a.assessmentId !== assessment.assessmentId)]);
  },

  saveFrameSeries: (assessmentId, frames: FrameSample[]) => storage.setItem(framesKey(assessmentId), frames),
  getFrameSeriesCount: async (assessmentId) => (await list<FrameSample>(framesKey(assessmentId))).length,
};
