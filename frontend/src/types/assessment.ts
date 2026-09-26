import type { AnswerMap } from "@/src/types/questionnaire";

// Assessment domain types.
//
// One Assessment is one screening session for one patient. It snapshots the
// questionnaire answers and stores the final calculated camera features and
// quality. Every camera value is `null` until a real on-device pose provider
// measures it. Nothing here is a diagnosis or a probability.

export const FEATURE_SCHEMA_VERSION = 2;

export const MOVEMENT_TESTS = ["sit_to_stand", "gait_walk", "knee_flexion", "squat"] as const;
export type MovementTest = (typeof MOVEMENT_TESTS)[number];

export type CameraPermissionState = "granted" | "denied" | "undetermined";

export type PoseProvider = "none" | "mediapipe_webview";

export type CameraFeatures = {
  provider: PoseProvider;
  // Knee flexion angle (0° = straight leg). ROM = max − min over the session.
  kneeRomDeg: number | null;
  leftKneeRomDeg: number | null;
  rightKneeRomDeg: number | null;
  // 95th percentile of |dθ/dt| of the knee flexion angle.
  peakAngularVelocityDegS: number | null;
  // Gait-only features.
  cadenceStepsPerMin: number | null;
  stepSymmetry: number | null; // 0–100 %, ratio of mean left/right step time
  stepTimeS: number | null;
  // Non-gait: number of completed flexion/extension cycles.
  repetitions: number | null;
  frameCount: number | null;
};

export type QualityState = "NOT_AVAILABLE" | "INSUFFICIENT" | "VALID";

export type AssessmentQuality = {
  state: QualityState;
  poseVisibility: number | null; // 0–1 mean visibility of hips, knees, ankles
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

// Frame-level raw data. Stored separately from the assessment record.
export type FrameSample = {
  t: number; // seconds since session start
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
  visibility: number;
  ankleGap: number; // |left ankle x − right ankle x| in normalized image units
  hipX: number; // mid-hip x in normalized image units
  leftAnkleX: number;
  rightAnkleX: number;
};

export const EMPTY_CAMERA_FEATURES: CameraFeatures = {
  provider: "none",
  kneeRomDeg: null,
  leftKneeRomDeg: null,
  rightKneeRomDeg: null,
  peakAngularVelocityDegS: null,
  cadenceStepsPerMin: null,
  stepSymmetry: null,
  stepTimeS: null,
  repetitions: null,
  frameCount: null,
};
