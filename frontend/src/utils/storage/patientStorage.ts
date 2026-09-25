import { storage } from "@/src/utils/storage";
import type { Patient } from "@/src/types/patient";

const PATIENTS_KEY = "oa-risk-detector/patients";

export async function getPatients(): Promise<Patient[]> {
  const patients = await storage.getItem<Patient[]>(PATIENTS_KEY, []);
  return patients ?? [];
}

export async function savePatient(patient: Patient): Promise<boolean> {
  const patients = await getPatients();
  const nextPatients = [
    patient,
    ...patients.filter((existing) => existing.patientId !== patient.patientId),
  ];
  return storage.setItem(PATIENTS_KEY, nextPatients);
}

export async function getPatientCount(): Promise<number> {
  return (await getPatients()).length;
}