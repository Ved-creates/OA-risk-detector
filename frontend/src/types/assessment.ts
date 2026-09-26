import type { AnswerMap } from "@/src/types/questionnaire";

// Assessment domain types.
//
// One Assessment is one screening session for one patient. It snapshots the
// questionnaire answers and reserves typed slots for camera features and
// quality. Every camera value is `null` until a real on-device pose provider
// produces it. Nothing here is a diagnosis or a probability.

export const FEATURE_SCHEMA_VERSION = 1;

export const MOVEMENT_TESTS = ["sit_to_stand", "gait_walk", "knee_flexion", "squat"] as const;
export type MovementTest = (typeof MOVEMENT_TESTS)[number];

export type CameraPermissionState = "granted" | "denied" | "undetermined";

export type CameraFeatures = {
  provider: "none" | "on_device_pose";
  kneeRomDeg: number | null;
  peakAngularVelocityDegS: number | null;
  cadenceStepsPerMin: number | null;
  stepSymmetry: number | null;
  stanceTimeS: number | null;
  frameCount: number | null;
};

export type QualityState = "NOT_AVAILABLE" | "INSUFFICIENT" | "VALID";

export type AssessmentQuality = {
  state: QualityState;
  poseVisibility: number | null;
  note: string;
};

export type AssessmentStatus = "COMPLETED_NO_CAMERA_METRICS" | "COMPLETED";

export type Assessment = {
  assessmentId: string;
  featureSchemaVersion: number;
  patientId: string;
  patientName: string;
  bodyRegion: string;
  movementTest: MovementTest;
  createdAt: string;
  status: AssessmentStatus;
  cameraPermission: CameraPermissionState;
  // Real wall-clock duration of the camera session, in seconds. 0 if the
  // camera step was skipped.
  sessionDurationS: number;
  questionnaire: {
    answers: AnswerMap;
    answeredCount: number;
    completedAt?: string;
  };
  cameraFeatures: CameraFeatures;
  quality: AssessmentQuality;
};
