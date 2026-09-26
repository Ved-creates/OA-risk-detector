import { createElement, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { buildPoseHtml } from "@/src/pose/poseHtml";
import type { PoseCameraProps } from "@/src/pose/types";

// Web preview implementation: react-native-webview has no web target, so the
// same MediaPipe page is embedded in an iframe and talks back via postMessage.
export function PoseCamera({ facing, onMessage }: PoseCameraProps) {
  const html = useMemo(() => buildPoseHtml(facing), [facing]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.data === "string" && event.data.startsWith("{")) onMessage(event.data);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onMessage]);

  return (
    <View style={styles.fill}>
      {createElement("iframe", {
        srcDoc: html,
        allow: "camera; microphone",
        style: { border: "none", width: "100%", height: "100%", background: "transparent" },
        title: "Pose camera",
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
