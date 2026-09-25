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

- Questionnaire with 17 dynamically visible questions, one-question horizontal transitions, multi-select activities, answer preservation, and local structured response storage.
- Questionnaire review and assessment setup screens.
- Real mobile camera integration and permission handling.
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

1. Implement Checkpoint 2 questionnaire data model and one-question navigation.
2. Add conditional injury and other-joint-condition follow-ups without erasing answers.
3. Add questionnaire review before movement assessment setup.
4. Then implement the assessment setup and real camera integration checkpoints.