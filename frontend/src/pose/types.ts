export type PoseFacing = "user" | "environment";

export type PoseCameraProps = {
  facing: PoseFacing;
  onMessage: (raw: string) => void;
};

export type PosePoint = [x: number, y: number, visibility: number];
export type WorldPoint = [x: number, y: number, z: number];

export type PoseMessage =
  | { type: "status"; stage: "loading" | "camera" | "ready" }
  | { type: "error"; message: string }
  | { type: "pose"; t: number; img: Record<string, PosePoint>; world: Record<string, WorldPoint> }
  | { type: "nopose"; t: number };

export function parsePoseMessage(raw: string): PoseMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === "string") return parsed as PoseMessage;
  } catch {
    // Non-JSON messages (e.g. devtools noise) are ignored.
  }
  return null;
}
