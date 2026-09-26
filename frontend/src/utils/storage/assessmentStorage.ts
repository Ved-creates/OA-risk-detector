import { localDb } from "@/src/db";
import type { Assessment, FrameSample } from "@/src/types/assessment";

// Local assessment records, newest first. On this device only. The list is
// empty until a session is completed; nothing is seeded.

export function getAssessments(): Promise<Assessment[]> {
  return localDb.getAssessments();
}

export function getAssessment(assessmentId: string): Promise<Assessment | null> {
  return localDb.getAssessment(assessmentId);
}

export async function getAssessmentsForPatient(patientId: string): Promise<Assessment[]> {
  return (await getAssessments()).filter((a) => a.patientId === patientId);
}

export function saveAssessment(assessment: Assessment): Promise<boolean> {
  return localDb.saveAssessment(assessment);
}

// Frame-level raw data is stored apart from the assessment record.
export function saveFrameSeries(assessmentId: string, frames: FrameSample[]): Promise<boolean> {
  return localDb.saveFrameSeries(assessmentId, frames);
}

export function getFrameSeriesCount(assessmentId: string): Promise<number> {
  return localDb.getFrameSeriesCount(assessmentId);
}

export async function getAssessmentCount(): Promise<number> {
  return (await getAssessments()).length;
}

export const storageEngine = localDb.engine;

export function generateAssessmentId() {
  const datePart = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AS-${datePart}-${randomPart}`;
}
