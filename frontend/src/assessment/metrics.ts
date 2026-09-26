import type { Assessment, CameraFeatures, MovementTest } from "@/src/types/assessment";

// Metric slots shown in the camera step, summary and baseline. Labels and
// units only — no normal ranges, no interpretation.

export type MetricKey = keyof Omit<CameraFeatures, "provider" | "frameCount"> | "poseVisibility";

export type MetricSlot = { key: MetricKey; label: string; unit: string; tests?: MovementTest[] };

const GAIT: MovementTest[] = ["gait_walk"];
const NON_GAIT: MovementTest[] = ["sit_to_stand", "knee_flexion", "squat"];

export const METRIC_SLOTS: MetricSlot[] = [
  { key: "kneeRomDeg", label: "Knee ROM", unit: "°" },
  { key: "leftKneeRomDeg", label: "Left knee ROM", unit: "°" },
  { key: "rightKneeRomDeg", label: "Right knee ROM", unit: "°" },
  { key: "peakAngularVelocityDegS", label: "Peak angular velocity", unit: "°/s" },
  { key: "repetitions", label: "Repetitions", unit: "cycles", tests: NON_GAIT },
  { key: "cadenceStepsPerMin", label: "Cadence", unit: "steps/min", tests: GAIT },
  { key: "stepTimeS", label: "Step time", unit: "s", tests: GAIT },
  { key: "stepSymmetry", label: "Step symmetry", unit: "%", tests: GAIT },
  { key: "poseVisibility", label: "Pose visibility", unit: "%" },
];

export function slotsForTest(test: MovementTest): MetricSlot[] {
  return METRIC_SLOTS.filter((s) => !s.tests || s.tests.includes(test));
}

export function metricValue(assessment: Pick<Assessment, "cameraFeatures" | "quality">, key: MetricKey): number | null {
  if (key === "poseVisibility") {
    const v = assessment.quality.poseVisibility;
    return v === null ? null : Math.round(v * 100);
  }
  return assessment.cameraFeatures[key];
}

export function formatMetric(value: number | null, unit: string): string {
  if (value === null || Number.isNaN(value)) return "--";
  if (unit === "°" || unit === "°/s") return `${Math.round(value)}`;
  if (unit === "s") return value.toFixed(2);
  return `${Math.round(value * 10) / 10}`;
}
