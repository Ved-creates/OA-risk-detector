# OA Risk Detector — Product Requirements Document

## Problem statement

OA Risk Detector is an offline-first mobile movement and symptom screening application for osteoarthritis risk indicators. It supports patient details, structured symptom questionnaires, camera-derived movement measurements, local history, and personal baselines. It is screening/referral support only: it must never diagnose osteoarthritis, calculate or display an unsupported OA probability, or invent camera, BLE, or ML results.

The supplied camera prototype contains real Python/OpenCV/MediaPipe logic for pose landmarks, joint angles, ROM, angular velocity, gait timing, symmetry, quality tracking, and JSON/CSV session storage. The mobile app will preserve those measurement concepts and adapt them through native-compatible providers rather than replacing them with fake values.

## Architecture

- **Mobile:** Expo Router + React Native, Android/iOS-compatible UI, safe-area-aware screens, keyboard-safe forms, and themed components.
- **Offline storage:** AsyncStorage-backed local persistence during the Expo implementation; structured local entities are designed to map to Room/SQLite in a native pose/database layer later.
- **Camera pipeline target:** Camera input → on-device pose detection → landmarks → joint angles → movement tracking → feature extraction → assessment record.
- **Future provider boundaries:** `CameraFeatureProvider`, `IoTFeatureProvider`, and `MLModelRunner`; BLE and ML remain unavailable until real implementations are supplied.
- **Network:** No backend dependency for core patient or assessment flows. The existing generic FastAPI/Mongo scaffold is not used for local clinical data.

## User personas

1. **Patient** — provides personal details and symptom answers in a calm, understandable flow without receiving a diagnosis.
2. **Clinician, researcher, or assessor** — starts an assessment, positions the camera, reviews measured movement features, quality, and prior personal baseline.
3. **Student project teammate** — integrates validated on-device pose, BLE, and local ML providers without changing the safe data contract or medical language.

## Core requirements (static)

- Work offline for patient creation, questionnaire, camera processing, feature extraction, saving, history, and baseline review.
- Keep the database empty on first launch; never seed sample patients, assessments, measurements, or diagnoses.
- Collect patient details, body region, structured questionnaire answers, camera features, assessment quality, and baseline values.
- Display exactly one questionnaire question at a time with conditional follow-ups and preserved answers.
- Process camera measurements continuously and show `--` until real values exist.
- Keep frame-level raw data separate from final calculated assessment features.
- Clearly distinguish movement measurements from clinical interpretation.
- Use non-diagnostic wording including “Not a diagnosis.”
- Do not hard-code universal medical normal thresholds or fabricate ML/BLE output.
- Use warm ivory, beige, muted sage, charcoal, warm brown, and subtle terracotta clinical styling.

## Implemented with dates

### 2026-09-26 — Real pose tracking, personal baseline, SQLite

- **Pose provider (MediaPipe Pose Landmarker in a WebView/iframe):** `src/pose/poseHtml.ts` builds a self-contained page that runs `@mediapipe/tasks-vision@0.10.35` (WASM, GPU→CPU fallback, `pose_landmarker_lite` model from Google storage, downloaded once on first use) on the live camera stream, draws the skeleton, and posts lower-body landmarks (image + world coords + visibility) to the app. `PoseCamera.tsx` (react-native-webview, native) / `PoseCamera.web.tsx` (iframe, preview). Camera flip and retry supported.
- **MovementTracker (`src/pose/movementTracker.ts`):** pure TS; knee flexion angle from hip–knee–ankle (3D world landmarks), EMA smoothing, per-side visibility gating, robust ROM (2–98th percentile), 95th-percentile angular velocity, hysteresis repetition counting, step detection from inter-ankle distance peaks → cadence, mean step time, left/right step-time symmetry (%). Quality: VALID / INSUFFICIENT with explicit reasons (no frames, too short, low visibility). Verified with synthetic signals (`scripts/tracker-check.ts`).
- **Camera screen:** live metric panel (left/right knee angle, ROM, reps or steps/cadence, frames, visibility) updating at 4 Hz while ASSESSING; final features computed on COMPLETE; insufficient sessions are never saved silently — a QUALITY CHECK panel offers RETRY or SAVE AS INSUFFICIENT.
- **Assessment record v2:** `cameraFeatures` (provider, knee ROM L/R, angular velocity, cadence, step symmetry, step time, repetitions, frame count) + `quality` (state, pose visibility, note); frame-level raw series saved separately (`frame_series`).
- **Personal baseline (`src/assessment/baseline.ts`):** summary shows the same patient's earlier VALID assessments of the same test side by side (This | date | date). No arithmetic, no norms.
- **SQLite (`src/db/index.ts`, expo-sqlite):** tables `patients`, `questionnaire_drafts`, `assessments` (indexed core columns + JSON record), `frame_series`; one-time import of earlier AsyncStorage records. `src/db/index.web.ts` keeps the AsyncStorage implementation for the web preview. Storage modules delegate to `localDb`.
- Home status: Pose detection row, storage engine row. Lint, TypeScript, tracker unit checks, and full end-to-end regression (testing agent, iteration 3) pass.

### 2026-09-26 — Checkpoint 3

- Review "Confirm & Continue" now routes into Assessment Setup.
- Assessment Setup screen: patient/region tags, movement test chooser (Sit-to-stand, Walking, Knee flexion, Squat), test-specific "How to move" steps, and a Camera Placement card (distance, height, lighting, clothing, space).
- Camera Assessment screen via `expo-camera`: truthful permission flow (undetermined → allow; denied → try again; blocked → Open Settings), "Continue without camera" fallback, live back-camera preview with framing guide, state badge (STARTING CAMERA / READY / ASSESSING / SAVING), real elapsed timer, and six metric slots (Knee ROM, peak angular velocity, cadence, step symmetry, stance time, pose visibility) fixed at `--` / Not available.
- Local `Assessment` record (`src/types/assessment.ts`, `assessmentStorage.ts`): snapshot of questionnaire answers, movement test, camera permission state, real session duration, camera features all `null` (provider "none"), quality `NOT_AVAILABLE`, schema version 1. Saved only on user action; nothing seeded.
- Assessment Summary screen: saved banner, patient/test/region/session info, quality state, `--` metrics, baseline note, mandatory "Not a diagnosis" disclaimer.
- History screen: newest-first list with patient, date, region, test, camera-metric status; empty state; pull-to-refresh; optional per-patient filter; tap opens summary.
- Home: HISTORY tile tappable with live count; Camera status reflects real permission (Not yet allowed / Permission denied / Ready).
- `app.json`: expo-camera plugin, iOS NSCameraUsageDescription, Android CAMERA permission.
- Lint, TypeScript, and end-to-end testing agent pass (live camera path and no-camera path).

### 2026-09-26 — Checkpoint 2

- Added structured 14-question questionnaire with two conditional injury follow-ups (Q10a/Q10b) and one conditional joint-condition follow-up (Q14a), for up to 17 visible questions.
- Implemented one-question-at-a-time UI with horizontal slide transitions (right→left for next, left→right for back) using Reanimated.
- Support for single-choice, multi-choice, and 0–10 scale question types with a warm clinical answer style.
- Progress bar and question counter that recompute total dynamically when conditional questions appear or hide.
- Answers persist across back navigation, are auto-saved locally as a per-patient draft, and hydrate on re-entry.
- "None of these" is exclusive in the multi-select activities question.
- Review screen groups answers by section, formats scale and multi-choice, and includes the "Not a diagnosis" style disclaimer.
- Patient Details "Continue" now routes to the questionnaire; the questionnaire never computes an OA score.
- Lint, TypeScript compilation, and mobile preview smoke tests pass.

### 2026-09-25 — Checkpoint 1

- Replaced the starter image screen with the OA Risk Detector home screen.
- Added actual current system states: Camera unavailable, local storage available, ML model not installed, and BLE not connected.
- Added New Assessment navigation to Patient Details.
- Added validated patient form for ID, name, age, sex, height, weight, and body region.
- Added generated local patient IDs when the ID field is blank.
- Added local patient persistence with no backend or internet dependency.
- Added local-save confirmation and saved-patient count on Home.
- Applied the design-agent warm ivory clinical theme tokens.
- Added stable test IDs and storage error handling after independent testing.
- Lint, TypeScript compilation, and mobile preview smoke tests pass.

## Prioritized backlog

### P0 — required for the core app

- Real mobile camera integration and permission handling (next checkpoint).
- On-device pose provider connected to the supplied measurement concepts without fake values.
- Assessment, camera feature, and assessment quality persistence.
- Assessment summary with quality state, measured values, baseline comparison, and mandatory non-diagnostic disclaimer.
- Patient-specific history and assessment detail view.
- Personal baseline creation from previous real assessments.

### P1 — important supporting capabilities

- Raw frame-series association/export separate from normal patient records.
- Real-time movement quality states: READY, CALIBRATING, ASSESSING, PAUSED, COMPLETED, INVALID, SAVED.
- Camera quality insufficiency flow with retry/cancel and no silent save.
- Rigged GLB/GLTF avatar adapter with drag, pinch, reset, and camera-derived visualization only.
- Feature schema/version metadata matching the supplied storage design.

### P2 — teammate integrations and refinements

- Real BLE/IoT provider implementation supplied by the hardware teammate.
- Local ML model runner supplied by the ML teammate; missing output remains unavailable.
- Feature fusion layer for camera, questionnaire, baseline, and future IoT data.
- Clinically validated interpretation language, if approved by the project’s clinical reviewers.

## Next tasks

1. Validate the WebView pose provider on a real Android phone (Expo Go): camera permission hand-off to the WebView, model download, frame rate.
2. Patients list screen and repeat assessment for an existing patient.
3. Native production pose provider (VisionCamera + TFLite) behind the same `PoseMessage` contract for fully offline use.
4. Raw frame-series export (CSV/JSON) separate from patient records.