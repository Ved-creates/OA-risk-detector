import type { MovementTest } from "@/src/types/assessment";

// Movement tests offered in the camera step. Instruction copy is positioning
// guidance only; it never interprets results.

export type MovementTestInfo = {
  id: MovementTest;
  label: string;
  short: string;
  steps: string[];
};

export const MOVEMENT_TEST_INFO: Record<MovementTest, MovementTestInfo> = {
  sit_to_stand: {
    id: "sit_to_stand",
    label: "Sit-to-stand",
    short: "Rise from a chair and sit back down",
    steps: [
      "Sit on a firm chair with feet flat on the floor.",
      "Stand up fully, then sit back down at a comfortable pace.",
      "Repeat for the duration of the assessment.",
    ],
  },
  gait_walk: {
    id: "gait_walk",
    label: "Walking",
    short: "Walk across the frame at your usual pace",
    steps: [
      "Start at one side of the camera view.",
      "Walk across the frame at your normal walking speed.",
      "Turn and walk back. Keep the whole body visible.",
    ],
  },
  knee_flexion: {
    id: "knee_flexion",
    label: "Knee flexion",
    short: "Bend and straighten the knee while standing",
    steps: [
      "Stand sideways to the camera, holding support if needed.",
      "Slowly bend the knee as far as is comfortable.",
      "Straighten the leg and repeat.",
    ],
  },
  squat: {
    id: "squat",
    label: "Squat",
    short: "Lower into a comfortable squat and return",
    steps: [
      "Stand facing the camera with feet shoulder-width apart.",
      "Lower into a squat only as far as is comfortable.",
      "Return to standing and repeat.",
    ],
  },
};

export const FRAMING_TIPS: { title: string; detail: string }[] = [
  { title: "Distance", detail: "Place the phone about 2–3 metres away so the whole body fits in view." },
  { title: "Height", detail: "Rest the phone at roughly hip height on a stable surface." },
  { title: "Lighting", detail: "Use an evenly lit room. Avoid strong light behind the person." },
  { title: "Clothing", detail: "Fitted clothing helps the joints stay visible." },
  { title: "Space", detail: "Clear the area so movement is not blocked." },
];

// Metric slots shown in the camera step. Values remain "--" until a real
// on-device pose provider is connected. Labels only — no thresholds.
export const METRIC_SLOTS: { key: string; label: string; unit: string }[] = [
  { key: "kneeRomDeg", label: "Knee ROM", unit: "°" },
  { key: "peakAngularVelocityDegS", label: "Peak angular velocity", unit: "°/s" },
  { key: "cadenceStepsPerMin", label: "Cadence", unit: "steps/min" },
  { key: "stepSymmetry", label: "Step symmetry", unit: "" },
  { key: "stanceTimeS", label: "Stance time", unit: "s" },
  { key: "poseVisibility", label: "Pose visibility", unit: "" },
];
