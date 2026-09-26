import type { Assessment, FrameSample } from "@/src/types/assessment";
import type { Patient } from "@/src/types/patient";
import type { QuestionnaireDraft } from "@/src/types/questionnaire";

// Local database contract. Native uses expo-sqlite (db/index.ts); the web
// preview uses AsyncStorage (db/index.web.ts). Both are on-device only.
export interface LocalDb {
  getPatients(): Promise<Patient[]>;
  savePatient(patient: Patient): Promise<boolean>;

  getDraft(patientId: string): Promise<QuestionnaireDraft | null>;
  saveDraft(draft: QuestionnaireDraft): Promise<boolean>;
  clearDraft(patientId: string): Promise<boolean>;

  getAssessments(): Promise<Assessment[]>;
  getAssessment(assessmentId: string): Promise<Assessment | null>;
  saveAssessment(assessment: Assessment): Promise<boolean>;

  saveFrameSeries(assessmentId: string, frames: FrameSample[]): Promise<boolean>;
  getFrameSeriesCount(assessmentId: string): Promise<number>;

  engine: "sqlite" | "async-storage";
}
