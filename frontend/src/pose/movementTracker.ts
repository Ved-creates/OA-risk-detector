// Movement tracker: turns per-frame pose landmarks into live and final
// movement features. Pure TypeScript, no React, no platform APIs.
//
// Measurement only. Nothing here interprets values clinically; there are no
// medical normal ranges. The only thresholds are measurement-quality checks
// (enough frames, enough visibility) and signal-processing parameters.

import type { AssessmentQuality, CameraFeatures, FrameSample, MovementTest } from "../types/assessment";
import type { PoseMessage, PosePoint, WorldPoint } from "./types";

const L = { hip: 23, knee: 25, ankle: 27 } as const;
const R = { hip: 24, knee: 26, ankle: 28 } as const;
const VISIBILITY_INDICES = [23, 24, 25, 26, 27, 28];

// Signal / quality parameters (not clinical thresholds).
const ANGLE_SMOOTHING = 0.4; // EMA factor for knee angle
const GAP_SMOOTHING = 0.5; // EMA factor for inter-ankle distance
const SIDE_MIN_VISIBILITY = 0.5; // below this a side's knee angle is not trusted
const MIN_FRAMES_VALID = 30;
const MIN_DURATION_VALID_S = 3;
const MIN_MEAN_VISIBILITY_VALID = 0.5;
const MIN_STEP_SEPARATION_S = 0.25;
const MIN_REP_RANGE_DEG = 15;

export type LiveMetrics = {
  frameCount: number;
  durationS: number;
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
  kneeRomDeg: number | null;
  repetitions: number | null;
  steps: number | null;
  cadenceStepsPerMin: number | null;
  visibility: number | null;
};

export type FinalResult = {
  features: CameraFeatures;
  quality: AssessmentQuality;
  frames: FrameSample[];
};

type Vec3 = [number, number, number];

export class MovementTracker {
  private frames: FrameSample[] = [];
  private startT: number | null = null;
  private lastT: number | null = null;
  private emaLeft: number | null = null;
  private emaRight: number | null = null;
  private emaGap: number | null = null;
  private noPoseFrames = 0;
  private readonly test: MovementTest;

  constructor(test: MovementTest) {
    this.test = test;
  }

  reset() {
    this.frames = [];
    this.startT = null;
    this.lastT = null;
    this.emaLeft = null;
    this.emaRight = null;
    this.emaGap = null;
    this.noPoseFrames = 0;
  }

  get frameCount() {
    return this.frames.length;
  }

  get durationS() {
    if (this.startT === null || this.lastT === null) return 0;
    return (this.lastT - this.startT) / 1000;
  }

  handle(message: PoseMessage) {
    if (message.type === "nopose") {
      this.noPoseFrames += 1;
      return;
    }
    if (message.type !== "pose") return;
    this.addPose(message.t, message.img, message.world);
  }

  addPose(tMs: number, img: Record<string, PosePoint>, world: Record<string, WorldPoint>) {
    if (this.startT === null) this.startT = tMs;
    this.lastT = tMs;

    const left = kneeFlexion(img, world, L);
    const right = kneeFlexion(img, world, R);
    this.emaLeft = ema(this.emaLeft, left, ANGLE_SMOOTHING);
    this.emaRight = ema(this.emaRight, right, ANGLE_SMOOTHING);

    const la = img[L.ankle];
    const ra = img[R.ankle];
    const lh = img[L.hip];
    const rh = img[R.hip];
    const gap = la && ra ? Math.abs(la[0] - ra[0]) : 0;
    this.emaGap = ema(this.emaGap, gap, GAP_SMOOTHING);

    const visibility = mean(VISIBILITY_INDICES.map((i) => img[i]?.[2] ?? 0));

    this.frames.push({
      t: round((tMs - this.startT) / 1000, 3),
      leftKneeDeg: this.emaLeft === null ? null : round(this.emaLeft, 1),
      rightKneeDeg: this.emaRight === null ? null : round(this.emaRight, 1),
      visibility: round(visibility, 3),
      ankleGap: round(this.emaGap ?? gap, 4),
      hipX: lh && rh ? round((lh[0] + rh[0]) / 2, 4) : 0.5,
      leftAnkleX: la ? la[0] : 0,
      rightAnkleX: ra ? ra[0] : 0,
    });
  }

  live(): LiveMetrics {
    const last = this.frames[this.frames.length - 1];
    const primary = this.primarySeries();
    const rom = primary ? robustRange(primary.values) : null;
    const isGait = this.test === "gait_walk";
    const steps = isGait ? detectSteps(this.frames) : null;
    return {
      frameCount: this.frames.length,
      durationS: this.durationS,
      leftKneeDeg: last?.leftKneeDeg ?? null,
      rightKneeDeg: last?.rightKneeDeg ?? null,
      kneeRomDeg: rom,
      repetitions: !isGait && primary ? countCycles(primary.values) : null,
      steps: steps ? steps.length : null,
      cadenceStepsPerMin: steps ? cadenceFromSteps(steps) : null,
      visibility: last ? mean(this.frames.slice(-15).map((f) => f.visibility)) : null,
    };
  }

  finalize(sessionDurationS: number): FinalResult {
    const frames = this.frames;
    const meanVis = frames.length ? mean(frames.map((f) => f.visibility)) : null;
    const leftSeries = series(frames, "leftKneeDeg");
    const rightSeries = series(frames, "rightKneeDeg");
    const primary = this.primarySeries();
    const isGait = this.test === "gait_walk";
    const steps = isGait ? detectSteps(frames) : null;

    const features: CameraFeatures = {
      provider: "mediapipe_webview",
      kneeRomDeg: primary ? robustRange(primary.values) : null,
      leftKneeRomDeg: robustRange(leftSeries.values),
      rightKneeRomDeg: robustRange(rightSeries.values),
      peakAngularVelocityDegS: peakAngularVelocity(leftSeries, rightSeries),
      cadenceStepsPerMin: steps ? cadenceFromSteps(steps) : null,
      stepSymmetry: steps ? stepSymmetry(frames, steps) : null,
      stepTimeS: steps ? meanStepTime(steps) : null,
      repetitions: !isGait && primary ? countCycles(primary.values) : null,
      frameCount: frames.length,
    };

    let quality: AssessmentQuality;
    if (frames.length === 0) {
      quality = {
        state: "INSUFFICIENT",
        poseVisibility: null,
        note: this.noPoseFrames > 0 ? "The camera ran but no person was detected in frame." : "No pose frames were received from the camera.",
      };
    } else if (frames.length < MIN_FRAMES_VALID || sessionDurationS < MIN_DURATION_VALID_S) {
      quality = { state: "INSUFFICIENT", poseVisibility: meanVis, note: "The session was too short to measure movement reliably." };
    } else if ((meanVis ?? 0) < MIN_MEAN_VISIBILITY_VALID) {
      quality = { state: "INSUFFICIENT", poseVisibility: meanVis, note: "Hips, knees or ankles were not visible enough during the session." };
    } else {
      quality = { state: "VALID", poseVisibility: meanVis, note: "Movement features were measured from the live pose stream on this device." };
    }

    return { features, quality, frames };
  }

  // The side with more trusted samples is used for the headline ROM and reps.
  private primarySeries() {
    const left = series(this.frames, "leftKneeDeg");
    const right = series(this.frames, "rightKneeDeg");
    if (left.values.length === 0 && right.values.length === 0) return null;
    return left.values.length >= right.values.length ? left : right;
  }
}

// -----------------------------------------------------------------------------
// Geometry
// -----------------------------------------------------------------------------

function kneeFlexion(
  img: Record<string, PosePoint>,
  world: Record<string, WorldPoint>,
  side: { hip: number; knee: number; ankle: number },
): number | null {
  const vis = Math.min(img[side.hip]?.[2] ?? 0, img[side.knee]?.[2] ?? 0, img[side.ankle]?.[2] ?? 0);
  if (vis < SIDE_MIN_VISIBILITY) return null;
  const pick = (i: number): Vec3 | null => {
    const w = world[i];
    if (w) return [w[0], w[1], w[2]];
    const p = img[i];
    return p ? [p[0], p[1], 0] : null;
  };
  const hip = pick(side.hip);
  const knee = pick(side.knee);
  const ankle = pick(side.ankle);
  if (!hip || !knee || !ankle) return null;
  const inner = angleAt(hip, knee, ankle);
  return inner === null ? null : 180 - inner;
}

export function angleAt(a: Vec3, b: Vec3, c: Vec3): number | null {
  const ab: Vec3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cb: Vec3 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const na = Math.hypot(...ab);
  const nc = Math.hypot(...cb);
  if (na === 0 || nc === 0) return null;
  const cos = clamp((ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2]) / (na * nc), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

// -----------------------------------------------------------------------------
// Series helpers
// -----------------------------------------------------------------------------

type Series = { t: number[]; values: number[] };

function series(frames: FrameSample[], key: "leftKneeDeg" | "rightKneeDeg"): Series {
  const t: number[] = [];
  const values: number[] = [];
  for (const f of frames) {
    const v = f[key];
    if (v !== null) {
      t.push(f.t);
      values.push(v);
    }
  }
  return { t, values };
}

export function robustRange(values: number[]): number | null {
  if (values.length < 5) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return round(percentile(sorted, 0.98) - percentile(sorted, 0.02), 1);
}

function peakAngularVelocity(...all: Series[]): number | null {
  const speeds: number[] = [];
  for (const s of all) {
    for (let i = 1; i < s.values.length; i++) {
      const dt = s.t[i] - s.t[i - 1];
      if (dt <= 0 || dt > 0.2) continue;
      speeds.push(Math.abs((s.values[i] - s.values[i - 1]) / dt));
    }
  }
  if (speeds.length < 5) return null;
  speeds.sort((a, b) => a - b);
  return round(percentile(speeds, 0.95), 1);
}

// Count full flexion→extension cycles with hysteresis around the mid-range.
export function countCycles(values: number[]): number {
  if (values.length < 5) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range < MIN_REP_RANGE_DEG) return 0;
  const high = min + range * 0.65;
  const low = min + range * 0.35;
  let above = false;
  let count = 0;
  for (const v of values) {
    if (!above && v > high) above = true;
    else if (above && v < low) {
      above = false;
      count += 1;
    }
  }
  return count;
}

// Step events = local maxima of the (smoothed) inter-ankle distance.
export type StepEvent = { index: number; t: number };

export function detectSteps(frames: FrameSample[]): StepEvent[] {
  if (frames.length < 10) return [];
  const gap = frames.map((f) => f.ankleGap);
  const min = Math.min(...gap);
  const max = Math.max(...gap);
  const range = max - min;
  if (range < 0.02) return [];
  const floor = min + range * 0.4;
  const peaks: number[] = [];
  for (let i = 1; i < gap.length - 1; i++) {
    if (gap[i] >= gap[i - 1] && gap[i] > gap[i + 1] && gap[i] > floor) {
      const last = peaks[peaks.length - 1];
      if (last !== undefined && frames[i].t - frames[last].t < MIN_STEP_SEPARATION_S) {
        if (gap[i] > gap[last]) peaks[peaks.length - 1] = i;
      } else {
        peaks.push(i);
      }
    }
  }
  return peaks.map((index) => ({ index, t: frames[index].t }));
}

function cadenceFromSteps(steps: StepEvent[]): number | null {
  if (steps.length < 2) return null;
  const span = steps[steps.length - 1].t - steps[0].t;
  if (span <= 0) return null;
  return round(((steps.length - 1) / span) * 60, 1);
}

function meanStepTime(steps: StepEvent[]): number | null {
  if (steps.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < steps.length; i++) intervals.push(steps[i].t - steps[i - 1].t);
  return round(mean(intervals), 3);
}

// Ratio (%) of mean left vs right step time. Each step interval is labelled by
// the foot leading at its end peak; for frontal walking (no lateral hip
// travel) labels alternate.
function stepSymmetry(frames: FrameSample[], steps: StepEvent[]): number | null {
  if (steps.length < 5) return null;
  const left: number[] = [];
  const right: number[] = [];
  let lastLabel: "L" | "R" | null = null;
  for (let i = 1; i < steps.length; i++) {
    const cur = frames[steps[i].index];
    const prev = frames[steps[i - 1].index];
    const dir = cur.hipX - prev.hipX;
    let label: "L" | "R";
    if (Math.abs(dir) > 0.01) {
      const leftAhead = (cur.leftAnkleX - cur.rightAnkleX) * Math.sign(dir) > 0;
      label = leftAhead ? "L" : "R";
    } else {
      label = lastLabel === "L" ? "R" : "L";
    }
    lastLabel = label;
    (label === "L" ? left : right).push(steps[i].t - steps[i - 1].t);
  }
  if (left.length < 2 || right.length < 2) return null;
  const a = mean(left);
  const b = mean(right);
  if (a <= 0 || b <= 0) return null;
  return round((Math.min(a, b) / Math.max(a, b)) * 100, 1);
}

// -----------------------------------------------------------------------------
// Math
// -----------------------------------------------------------------------------

function ema(prev: number | null, next: number | null, alpha: number): number | null {
  if (next === null) return prev;
  if (prev === null) return next;
  return prev + alpha * (next - prev);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(Math.round((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[idx];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function round(v: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
