// Synthetic-signal check for MovementTracker. Run: node scripts/tracker-check.ts
import assert from "node:assert/strict";

import { MovementTracker, angleAt } from "../src/pose/movementTracker.ts";

const deg = (d: number) => (d * Math.PI) / 180;

// Build image + world landmarks for a leg with a given knee flexion angle.
function legFrame(flexion: number, ankleGapX: number, hipX = 0.5) {
  const img: Record<string, [number, number, number]> = {};
  const world: Record<string, [number, number, number]> = {};
  const build = (hip: number, knee: number, ankle: number, x: number, ankleX: number) => {
    // hip at origin, thigh straight down, shank rotated by flexion angle
    const thigh = 0.45;
    const shank = 0.45;
    const kneeP: [number, number, number] = [0, thigh, 0];
    const ankleP: [number, number, number] = [Math.sin(deg(flexion)) * shank, thigh + Math.cos(deg(flexion)) * shank, 0];
    world[hip] = [0, 0, 0];
    world[knee] = kneeP;
    world[ankle] = ankleP;
    img[hip] = [x, 0.4, 0.95];
    img[knee] = [x, 0.6, 0.95];
    img[ankle] = [ankleX, 0.85, 0.95];
  };
  build(23, 25, 27, hipX - 0.03, hipX - ankleGapX / 2);
  build(24, 26, 28, hipX + 0.03, hipX + ankleGapX / 2);
  return { img, world };
}

// angleAt sanity: straight leg → 180°, right angle → 90°
assert.equal(Math.round(angleAt([0, 0, 0], [0, 1, 0], [0, 2, 0])!), 180);
assert.equal(Math.round(angleAt([0, 0, 0], [0, 1, 0], [1, 1, 0])!), 90);

// 1) Sit-to-stand: 5 cycles of 0→90→0 over 15 s at 30 fps.
{
  const tr = new MovementTracker("sit_to_stand");
  const fps = 30;
  const total = 15 * fps;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    const flex = 45 - 45 * Math.cos((2 * Math.PI * t) / 3); // 0..90, period 3 s
    const { img, world } = legFrame(flex, 0.1);
    tr.addPose(t * 1000, img, world);
  }
  const res = tr.finalize(15);
  console.log("sit_to_stand", res.features, res.quality.state);
  assert.equal(res.quality.state, "VALID");
  assert.ok(res.features.kneeRomDeg! > 80 && res.features.kneeRomDeg! <= 91, "ROM ≈ 90");
  assert.equal(res.features.repetitions, 5);
  assert.ok(res.features.peakAngularVelocityDegS! > 60, "angular velocity measured");
  assert.equal(res.features.cadenceStepsPerMin, null);
}

// 2) Gait: ankle gap oscillates at 2 steps/s (120 steps/min) for 10 s.
{
  const tr = new MovementTracker("gait_walk");
  const fps = 30;
  const total = 10 * fps;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    const s = Math.sin(Math.PI * t * 2);
    const gap = 0.1 + 0.08 * Math.abs(s); // peaks every 0.5 s
    const { img, world } = legFrame(20 + 10 * Math.sin(2 * Math.PI * t), gap * (s >= 0 ? 1 : -1), 0.2 + 0.06 * t);
    tr.addPose(t * 1000, img, world);
  }
  const res = tr.finalize(10);
  console.log("gait_walk", res.features, res.quality.state);
  assert.equal(res.quality.state, "VALID");
  assert.ok(Math.abs(res.features.cadenceStepsPerMin! - 120) < 8, "cadence ≈ 120");
  assert.ok(Math.abs(res.features.stepTimeS! - 0.5) < 0.05, "step time ≈ 0.5 s");
  assert.ok(res.features.stepSymmetry! > 85, "symmetric synthetic gait");
}

// 3) Too short → INSUFFICIENT; no frames → INSUFFICIENT.
{
  const tr = new MovementTracker("squat");
  for (let i = 0; i < 10; i++) {
    const { img, world } = legFrame(10, 0.1);
    tr.addPose(i * 33, img, world);
  }
  assert.equal(tr.finalize(0.3).quality.state, "INSUFFICIENT");
  assert.equal(new MovementTracker("squat").finalize(5).quality.state, "INSUFFICIENT");
}

// 4) Low visibility → side angle untrusted → no ROM.
{
  const tr = new MovementTracker("knee_flexion");
  for (let i = 0; i < 120; i++) {
    const { img, world } = legFrame(30, 0.1);
    for (const k of Object.keys(img)) img[k][2] = 0.2;
    tr.addPose(i * 33, img, world);
  }
  const res = tr.finalize(4);
  assert.equal(res.features.kneeRomDeg, null);
  assert.equal(res.quality.state, "INSUFFICIENT");
}

console.log("tracker checks passed");
