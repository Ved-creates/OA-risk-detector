import type { QualityState } from "@/src/types/assessment";

export function qualityLabel(state: QualityState) {
  if (state === "VALID") return "Valid";
  if (state === "INSUFFICIENT") return "Insufficient";
  return "Not available";
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
