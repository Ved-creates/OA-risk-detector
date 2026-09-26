import type { Assessment } from "@/src/types/assessment";
import { getAssessmentsForPatient } from "@/src/utils/storage/assessmentStorage";

// Personal baseline: the same patient's earlier VALID assessments of the same
// movement test. Values are shown side by side; no arithmetic comparison and
// no population norms.

export type Baseline = {
  previous: Assessment[]; // newest first, excluding the current record
};

export async function getBaseline(current: Assessment): Promise<Baseline> {
  const all = await getAssessmentsForPatient(current.patientId);
  const previous = all
    .filter((a) => a.assessmentId !== current.assessmentId)
    .filter((a) => a.movementTest === current.movementTest)
    .filter((a) => a.quality.state === "VALID")
    .filter((a) => a.createdAt < current.createdAt)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { previous };
}
