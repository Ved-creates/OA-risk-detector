import { useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { buildPoseHtml } from "@/src/pose/poseHtml";
import type { PoseCameraProps } from "@/src/pose/types";

// Native pose camera: MediaPipe runs inside a WebView. The app-level CAMERA
// permission (expo-camera) must already be granted; the WebView then receives
// the media permission automatically on Android, and via the grant type on iOS.
export function PoseCamera({ facing, onMessage }: PoseCameraProps) {
  const html = useMemo(() => buildPoseHtml(facing), [facing]);
  const ref = useRef<WebView>(null);

  return (
    <View style={styles.fill}>
      <WebView
        ref={ref}
        style={styles.fill}
        source={{ html, baseUrl: "https://oa-risk-detector.local/" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onMessage={(event) => onMessage(event.nativeEvent.data)}
        onError={(event) => onMessage(JSON.stringify({ type: "error", message: event.nativeEvent.description || "The pose view failed to load." }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
