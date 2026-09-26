import { storage } from "@/src/utils/storage";
import type { Assessment } from "@/src/types/assessment";

// Local assessment records. One list, newest first. On this device only.
// The list is empty until a session is completed; nothing is seeded.

const ASSESSMENTS_KEY = "oa-risk-detector/assessments";

export async function getAssessments(): Promise<Assessment[]> {
  const list = await storage.getItem<Assessment[]>(ASSESSMENTS_KEY, []);
  return list ?? [];
}

export async function getAssessment(assessmentId: string): Promise<Assessment | null> {
  const list = await getAssessments();
  return list.find((a) => a.assessmentId === assessmentId) ?? null;
}

export async function getAssessmentsForPatient(patientId: string): Promise<Assessment[]> {
  const list = await getAssessments();
  return list.filter((a) => a.patientId === patientId);
}

export async function saveAssessment(assessment: Assessment): Promise<boolean> {
  const list = await getAssessments();
  const next = [assessment, ...list.filter((a) => a.assessmentId !== assessment.assessmentId)];
  return storage.setItem(ASSESSMENTS_KEY, next);
}

export async function getAssessmentCount(): Promise<number> {
  return (await getAssessments()).length;
}

export function generateAssessmentId() {
  const datePart = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AS-${datePart}-${randomPart}`;
}
