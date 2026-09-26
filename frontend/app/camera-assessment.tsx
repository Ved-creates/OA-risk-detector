import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { METRIC_SLOTS, MOVEMENT_TEST_INFO } from "@/src/assessment/movementTests";
import { makeStyles, useTheme } from "@/src/theme";
import { FEATURE_SCHEMA_VERSION, type Assessment, type CameraPermissionState, type MovementTest } from "@/src/types/assessment";
import { generateAssessmentId, saveAssessment } from "@/src/utils/storage/assessmentStorage";
import { loadDraft } from "@/src/utils/storage/questionnaireStorage";

type Phase = "waiting" | "ready" | "assessing" | "saving";

export default function CameraAssessment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const params = useLocalSearchParams<{ patientId?: string; patientName?: string; bodyRegion?: string; test?: string }>();
  const test = (params.test as MovementTest) || "sit_to_stand";
  const info = MOVEMENT_TEST_INFO[test] ?? MOVEMENT_TEST_INFO.sit_to_stand;

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [mountError, setMountError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "assessing") return;
    const id = setInterval(() => {
      if (startedAt.current) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  const permissionState: CameraPermissionState = permission?.granted
    ? "granted"
    : permission?.status === "denied"
      ? "denied"
      : "undetermined";

  const finish = async (durationS: number) => {
    if (!params.patientId) {
      router.replace("/");
      return;
    }
    setPhase("saving");
    setSaveError(false);
    const draft = await loadDraft(params.patientId);
    const answers = draft?.answers ?? {};
    const record: Assessment = {
      assessmentId: generateAssessmentId(),
      featureSchemaVersion: FEATURE_SCHEMA_VERSION,
      patientId: params.patientId,
      patientName: params.patientName ?? "",
      bodyRegion: params.bodyRegion ?? "",
      movementTest: test,
      createdAt: new Date().toISOString(),
      status: "COMPLETED_NO_CAMERA_METRICS",
      cameraPermission: permissionState,
      sessionDurationS: durationS,
      questionnaire: {
        answers,
        answeredCount: Object.keys(answers).length,
        completedAt: draft?.completedAt,
      },
      cameraFeatures: {
        provider: "none",
        kneeRomDeg: null,
        peakAngularVelocityDegS: null,
        cadenceStepsPerMin: null,
        stepSymmetry: null,
        stanceTimeS: null,
        frameCount: null,
      },
      quality: {
        state: "NOT_AVAILABLE",
        poseVisibility: null,
        note: "On-device pose detection is not installed. No movement features were measured.",
      },
    };
    const saved = await saveAssessment(record);
    if (!saved) {
      setSaveError(true);
      setPhase(durationS > 0 ? "assessing" : "ready");
      return;
    }
    router.replace({ pathname: "/assessment-summary", params: { assessmentId: record.assessmentId } });
  };

  const handleBegin = () => {
    startedAt.current = Date.now();
    setElapsed(0);
    setPhase("assessing");
  };

  const handleComplete = () => {
    const durationS = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    finish(durationS);
  };

  // ---------------------------------------------------------------------------
  // Permission gate
  // ---------------------------------------------------------------------------
  if (!permission) {
    return (
      <View style={[styles.screen, styles.center]} testID="camera-loading">
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  if (!permission.granted || mountError) {
    const blocked = permission.status === "denied" && !permission.canAskAgain;
    const denied = permission.status === "denied";
    return (
      <View style={styles.screen} testID="camera-permission-screen">
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}>
          <TopBar onBack={() => router.back()} />
          <Text style={styles.title}>{mountError ? "Camera unavailable" : denied ? "Camera access needed" : "Allow camera access"}</Text>
          <Text style={styles.intro}>
            {mountError
              ? "The camera could not be started on this device. You can still save the questionnaire part of this assessment."
              : "The camera is used to observe joint movement during the test. Video stays on this device and is not uploaded."}
          </Text>

          <View style={styles.permissionCard}>
            <Ionicons name={mountError ? "alert-circle-outline" : "camera-outline"} size={28} color={colors.brandPrimary} />
            <Text style={styles.permissionTitle}>
              {mountError ? "Camera error" : blocked ? "Permission is blocked" : denied ? "Permission was declined" : "Camera permission"}
            </Text>
            <Text style={styles.permissionText}>
              {mountError
                ? mountError
                : blocked
                  ? "Camera access was turned off for this app. Enable it in system settings to run movement tests."
                  : denied
                    ? "Without camera access the movement test cannot be observed. You can allow it now or continue without it."
                    : "Only the live preview is used. No photos or videos are stored."}
            </Text>
            {!mountError ? (
              blocked ? (
                <Pressable onPress={() => Linking.openSettings()} testID="open-settings-button" accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Ionicons name="settings-outline" size={18} color={colors.onBrandPrimary} />
                  <Text style={styles.primaryText}>OPEN SETTINGS</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => requestPermission()} testID="request-permission-button" accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Ionicons name="camera-outline" size={18} color={colors.onBrandPrimary} />
                  <Text style={styles.primaryText}>{denied ? "TRY AGAIN" : "ALLOW CAMERA ACCESS"}</Text>
                </Pressable>
              )
            ) : null}
          </View>

          <Pressable
            onPress={() => finish(0)}
            disabled={phase === "saving"}
            testID="continue-without-camera-button"
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, phase === "saving" && styles.disabled]}
          >
            <Text style={styles.secondaryText}>{phase === "saving" ? "SAVING…" : "CONTINUE WITHOUT CAMERA"}</Text>
          </Pressable>
          {saveError ? <Text style={styles.errorText}>The assessment could not be saved on this device. Please try again.</Text> : null}
          <Text style={styles.footerHint}>Camera measurements will be recorded as not available.</Text>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Live camera
  // ---------------------------------------------------------------------------
  const stateLabel = phase === "waiting" ? "STARTING CAMERA" : phase === "ready" ? "READY" : phase === "assessing" ? "ASSESSING" : "SAVING";
  const stateTone = phase === "assessing" ? colors.warning : phase === "ready" ? colors.success : colors.muted;

  return (
    <View style={styles.cameraScreen} testID="camera-assessment-screen">
      <StatusBar style="light" />
      <View style={styles.cameraArea}>
        <CameraView
          style={styles.camera}
          facing="back"
          active
          onCameraReady={() => setPhase((p) => (p === "waiting" ? "ready" : p))}
          onMountError={(e) => setMountError(e.message || "The camera failed to start.")}
        />
        <View style={[styles.cameraOverlay, { paddingTop: insets.top + 10 }]}>
          <View style={styles.overlayTop}>
            <Pressable onPress={() => router.back()} style={styles.overlayBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back" testID="camera-back-button">
              <Ionicons name="arrow-back" size={21} color={colors.onSurfaceInverse} />
            </Pressable>
            <View style={styles.stateBadge} testID="camera-state-badge">
              <View style={[styles.stateDot, { backgroundColor: stateTone }]} />
              <Text style={styles.stateText}>{stateLabel}</Text>
            </View>
            <Text style={styles.timerText} testID="camera-timer">{formatElapsed(elapsed)}</Text>
          </View>
          <View style={styles.frameGuide} />
          <Text style={styles.overlayHint}>{phase === "assessing" ? info.short : "Keep the whole body inside the frame"}</Text>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{info.label.toUpperCase()}</Text>
          <Text style={styles.panelMeta}>{params.patientName || params.patientId}</Text>
        </View>

        <View style={styles.metricGrid} testID="metric-grid">
          {METRIC_SLOTS.map((slot) => (
            <View key={slot.key} style={styles.metric} testID={`metric-${slot.key}`}>
              <Text style={styles.metricLabel}>{slot.label}</Text>
              <Text style={styles.metricValue}>--</Text>
              <Text style={styles.metricUnit}>{slot.unit || "Not available"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={15} color={colors.warning} />
          <Text style={styles.noticeText}>Pose detection is not installed on this device. Live preview only — no measurements are produced.</Text>
        </View>

        {saveError ? <Text style={styles.errorText}>The assessment could not be saved on this device. Please try again.</Text> : null}

        {phase === "assessing" || phase === "saving" ? (
          <Pressable
            onPress={handleComplete}
            disabled={phase === "saving"}
            testID="complete-assessment-button"
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, phase === "saving" && styles.disabled]}
          >
            {phase === "saving" ? <ActivityIndicator color={colors.onBrandPrimary} /> : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.primaryText}>COMPLETE & SAVE</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={handleBegin}
            disabled={phase === "waiting"}
            testID="begin-assessment-button"
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, phase === "waiting" && styles.disabled]}
          >
            <Ionicons name="play" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.primaryText}>{phase === "waiting" ? "WAITING FOR CAMERA" : "BEGIN TEST"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back" testID="camera-back-button">
        <Ionicons name="arrow-back" size={21} color={colors.onSurface} />
      </Pressable>
      <Text style={styles.stepLabel}>NEW ASSESSMENT · 04</Text>
    </View>
  );
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 24 },
  topBar: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 30, marginTop: 22 },
  intro: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 370 },
  permissionCard: {
    marginTop: 28,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "flex-start",
  },
  permissionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginTop: 12 },
  permissionText: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  primaryButton: {
    minHeight: 52,
    marginTop: 18,
    alignSelf: "stretch",
    borderRadius: 10,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  secondaryButton: {
    minHeight: 52,
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: colors.onSurface, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 10, lineHeight: 17 },
  footerHint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },

  cameraScreen: { flex: 1, backgroundColor: colors.surfaceInverse },
  cameraArea: { flex: 1, backgroundColor: colors.surfaceInverse },
  camera: { flex: 1 },
  cameraOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: 14, justifyContent: "space-between", pointerEvents: "box-none" },
  overlayTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  overlayBack: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surfaceInverse,
    opacity: 0.92,
  },
  stateDot: { width: 7, height: 7, borderRadius: 4 },
  stateText: { color: colors.onSurfaceInverse, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  timerText: { color: colors.onSurfaceInverse, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"], minWidth: 48, textAlign: "right" },
  frameGuide: {
    alignSelf: "center",
    width: "62%",
    flex: 1,
    marginVertical: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.brandTertiary,
    opacity: 0.7,
  },
  overlayHint: { color: colors.onSurfaceInverse, fontSize: 13, textAlign: "center", opacity: 0.9 },

  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelTitle: { color: colors.onSurface, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  panelMeta: { color: colors.muted, fontSize: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  metric: {
    width: "31%",
    flexGrow: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  metricValue: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 22, marginTop: 4 },
  metricUnit: { color: colors.muted, fontSize: 10, marginTop: 2 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14 },
  noticeText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 17 },
}));
