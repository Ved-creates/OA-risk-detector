import * as SQLite from "expo-sqlite";

import type { LocalDb } from "@/src/db/types";
import type { Assessment, FrameSample } from "@/src/types/assessment";
import type { Patient } from "@/src/types/patient";
import type { QuestionnaireDraft } from "@/src/types/questionnaire";
import { storage } from "@/src/utils/storage";

// Native on-device database (expo-sqlite). Relational core columns plus JSON
// payload columns for nested structures. Frame-level raw data lives in its own
// table, separate from the final assessment features.

const DB_NAME = "oa_risk_detector.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open() {
  const handle = await SQLite.openDatabaseAsync(DB_NAME);
  await handle.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS patients (
      patient_id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      body_region TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questionnaire_drafts (
      patient_id TEXT PRIMARY KEY NOT NULL,
      answers_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assessments (
      assessment_id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      body_region TEXT NOT NULL,
      movement_test TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      quality_state TEXT NOT NULL,
      feature_schema_version INTEGER NOT NULL,
      record_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patient_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS frame_series (
      assessment_id TEXT NOT NULL,
      frame_index INTEGER NOT NULL,
      t REAL NOT NULL,
      left_knee_deg REAL,
      right_knee_deg REAL,
      visibility REAL NOT NULL,
      ankle_gap REAL NOT NULL,
      hip_x REAL NOT NULL,
      PRIMARY KEY (assessment_id, frame_index)
    );
  `);
  await migrateFromAsyncStorage(handle);
  return handle;
}

// One-time import of records written by the earlier AsyncStorage layer.
async function migrateFromAsyncStorage(handle: SQLite.SQLiteDatabase) {
  const patients = (await storage.getItem<Patient[]>("oa-risk-detector/patients", [])) ?? [];
  for (const p of patients) await upsertPatient(handle, p);
  if (patients.length) await storage.removeItem("oa-risk-detector/patients");

  const assessments = (await storage.getItem<Assessment[]>("oa-risk-detector/assessments", [])) ?? [];
  for (const a of assessments) await upsertAssessment(handle, a);
  if (assessments.length) await storage.removeItem("oa-risk-detector/assessments");
}

async function upsertPatient(handle: SQLite.SQLiteDatabase, p: Patient) {
  await handle.runAsync(
    `INSERT OR REPLACE INTO patients (patient_id, name, age, sex, height, weight, body_region, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    p.patientId, p.name, p.age, p.sex, p.height, p.weight, p.bodyRegion, p.createdAt,
  );
}

async function upsertAssessment(handle: SQLite.SQLiteDatabase, a: Assessment) {
  await handle.runAsync(
    `INSERT OR REPLACE INTO assessments
     (assessment_id, patient_id, patient_name, body_region, movement_test, created_at, status, quality_state, feature_schema_version, record_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    a.assessmentId, a.patientId, a.patientName, a.bodyRegion, a.movementTest, a.createdAt, a.status, a.quality.state, a.featureSchemaVersion, JSON.stringify(a),
  );
}

type PatientRow = { patient_id: string; name: string; age: number; sex: string; height: number; weight: number; body_region: string; created_at: string };
type DraftRow = { patient_id: string; answers_json: string; updated_at: string; completed_at: string | null };
type AssessmentRow = { record_json: string };

function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  return fn().catch((e) => {
    console.warn("[db]", e);
    return fallback;
  });
}

export const localDb: LocalDb = {
  engine: "sqlite",

  getPatients: () =>
    safe([], async () => {
      const rows = await (await db()).getAllAsync<PatientRow>("SELECT * FROM patients ORDER BY created_at DESC");
      return rows.map((r) => ({
        patientId: r.patient_id,
        name: r.name,
        age: r.age,
        sex: r.sex,
        height: r.height,
        weight: r.weight,
        bodyRegion: r.body_region as Patient["bodyRegion"],
        createdAt: r.created_at,
      }));
    }),

  savePatient: (patient) =>
    safe(false, async () => {
      await upsertPatient(await db(), patient);
      return true;
    }),

  getDraft: (patientId) =>
    safe(null, async () => {
      const row = await (await db()).getFirstAsync<DraftRow>("SELECT * FROM questionnaire_drafts WHERE patient_id = ?", patientId);
      if (!row) return null;
      return { patientId: row.patient_id, answers: JSON.parse(row.answers_json), updatedAt: row.updated_at, completedAt: row.completed_at ?? undefined };
    }),

  saveDraft: (draft) =>
    safe(false, async () => {
      await (await db()).runAsync(
        `INSERT OR REPLACE INTO questionnaire_drafts (patient_id, answers_json, updated_at, completed_at) VALUES (?, ?, ?, ?)`,
        draft.patientId, JSON.stringify(draft.answers), draft.updatedAt, draft.completedAt ?? null,
      );
      return true;
    }),

  clearDraft: (patientId) =>
    safe(false, async () => {
      await (await db()).runAsync("DELETE FROM questionnaire_drafts WHERE patient_id = ?", patientId);
      return true;
    }),

  getAssessments: () =>
    safe([], async () => {
      const rows = await (await db()).getAllAsync<AssessmentRow>("SELECT record_json FROM assessments ORDER BY created_at DESC");
      return rows.map((r) => JSON.parse(r.record_json) as Assessment);
    }),

  getAssessment: (assessmentId) =>
    safe(null, async () => {
      const row = await (await db()).getFirstAsync<AssessmentRow>("SELECT record_json FROM assessments WHERE assessment_id = ?", assessmentId);
      return row ? (JSON.parse(row.record_json) as Assessment) : null;
    }),

  saveAssessment: (assessment) =>
    safe(false, async () => {
      await upsertAssessment(await db(), assessment);
      return true;
    }),

  saveFrameSeries: (assessmentId, frames: FrameSample[]) =>
    safe(false, async () => {
      const handle = await db();
      await handle.withTransactionAsync(async () => {
        await handle.runAsync("DELETE FROM frame_series WHERE assessment_id = ?", assessmentId);
        const stmt = await handle.prepareAsync(
          `INSERT INTO frame_series (assessment_id, frame_index, t, left_knee_deg, right_knee_deg, visibility, ankle_gap, hip_x)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        try {
          for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            await stmt.executeAsync(assessmentId, i, f.t, f.leftKneeDeg, f.rightKneeDeg, f.visibility, f.ankleGap, f.hipX);
          }
        } finally {
          await stmt.finalizeAsync();
        }
      });
      return true;
    }),

  getFrameSeriesCount: (assessmentId) =>
    safe(0, async () => {
      const row = await (await db()).getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM frame_series WHERE assessment_id = ?", assessmentId);
      return row?.n ?? 0;
    }),
};
