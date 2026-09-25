export const BODY_REGIONS = [
  "Knee",
  "Hip",
  "Hand",
  "Neck",
  "Lower Back",
  "Multiple",
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export type Patient = {
  patientId: string;
  name: string;
  age: number;
  sex: string;
  height: number;
  weight: number;
  bodyRegion: BodyRegion;
  createdAt: string;
};