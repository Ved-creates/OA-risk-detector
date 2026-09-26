import { localDb } from "@/src/db";
import type { Patient } from "@/src/types/patient";

export function getPatients(): Promise<Patient[]> {
  return localDb.getPatients();
}

export function savePatient(patient: Patient): Promise<boolean> {
  return localDb.savePatient(patient);
}

export async function getPatientCount(): Promise<number> {
  return (await getPatients()).length;
}
