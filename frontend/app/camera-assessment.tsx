import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatMetric } from "@/src/assessment/metrics";
import { MOVEMENT_TEST_INFO } from "@/src/assessment/movementTests";
import { PoseCamera } from "@/src/pose/PoseCamera";
import { MovementTracker, type FinalResult, type LiveMetrics } from "@/src/pose/movementTracker";
import { parsePoseMessage, type PoseFacing } from "@/src/pose/types";
import { makeStyles, useTheme } from "@/src/theme";
import { EMPTY_CAMERA_FEATURES, FEATURE_SCHEMA_VERSION, type Assessment, type CameraPermissionState, type MovementTest } from "@/src/types/assessment";
import { generateAssessmentId, saveAssessment, saveFrameSeries } from "@/src/utils/storage/assessmentStorage";
import { loadDraft } from "@/src/utils/storage/questionnaireStorage";

type Phase = "waiting" | "ready" | "assessing" | "review" | "saving";
type PoseStage = "camera" | "loading" | "ready";

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
  const [saveError, setSaveError] = useState(false);
  const [poseStage, setPoseStage] = useState<PoseStage>("camera");
  const [poseError, setPoseError] = useState<string | null>(null);
  const [facing, setFacing] = useState<PoseFacing>("environment");
  const [cameraKey, setCameraKey] = useState(0);
  const [live, setLive] = useState<LiveMetrics | null>(null);
  const [pending, setPending] = useState<FinalResult | null>(null);
  const startedAt = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("waiting");
  const trackerRef = useRef<MovementTracker>(new MovementTracker(test));
  phaseRef.current = phase;

  useEffect(() => {
    if (phase !== "assessing") return;
    const id = setInterval(() => {
      if (startedAt.current) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      setLive(trackerRef.current.live());
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  const handlePoseMessage = useCallback((raw: string) => {
    const message = parsePoseMessage(raw);
    if (!message) return;
    if (message.type === "status") {
      setPoseStage(message.stage);
      if (message.stage === "ready") {
        setPoseError(null);
        setPhase((p) => (p === "waiting" ? "ready" : p));
      }
      return;
    }
    if (message.type === "error") {
      setPoseError(message.message);
      return;
    }
    if (phaseRef.current === "assessing") trackerRef.current.handle(message);
  }, []);

  const permissionState: CameraPermissionState = permission?.granted
    ? "granted"
    : permission?.status === "denied"
      ? "denied"
      : "undetermined";

  const finish = async (durationS: number, result: FinalResult | null) => {
    if (!params.patientId) {
      router.replace("/");
      return;
    }
    const previousPhase = phaseRef.current;
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
      status: result ? "COMPLETED" : "COMPLETED_NO_CAMERA_METRICS",
      cameraPermission: permissionState,
      sessionDurationS: durationS,
      questionnaire: {
        answers,
        answeredCount: Object.keys(answers).length,
        completedAt: draft?.completedAt,
      },
      cameraFeatures: result ? result.features : EMPTY_CAMERA_FEATURES,
      quality: result
        ? result.quality
        : {
            state: "NOT_AVAILABLE",
            poseVisibility: null,
            note: "The camera step was skipped. No movement features were measured.",
          },
    };
    const saved = await saveAssessment(record);
    if (!saved) {
      setSaveError(true);
      setPhase(previousPhase === "saving" ? "ready" : previousPhase);
      return;
    }
    if (result && result.frames.length > 0) await saveFrameSeries(record.assessmentId, result.frames);
    router.replace({ pathname: "/assessment-summary", params: { assessmentId: record.assessmentId } });
  };

  const handleBegin = () => {
    trackerRef.current.reset();
    startedAt.current = Date.now();
    setElapsed(0);
    setLive(null);
    setPending(null);
    setPhase("assessing");
  };

  const handleComplete = () => {
    const durationS = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    const result = trackerRef.current.finalize(durationS);
    if (result.quality.state !== "VALID") {
      // Never save an insufficient session silently: ask to retry or keep it.
      setPending(result);
      setPhase("review");
      return;
    }
    finish(durationS, result);
  };

  const handleRetry = () => {
    setPending(null);
    setPhase("ready");
  };

  const handleSavePending = () => {
    const durationS = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
    if (pending) finish(durationS, pending);
  };

  const flipCamera = () => {
    setFacing((f) => (f === "environment" ? "user" : "environment"));
    setPoseStage("camera");
    setPhase((p) => (p === "ready" ? "waiting" : p));
  };

  const retryCamera = () => {
    setPoseError(null);
    setPoseStage("camera");
    setPhase("waiting");
    setCameraKey((k) => k + 1);
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

  if (!permission.granted) {
    const blocked = permission.status === "denied" && !permission.canAskAgain;
    const denied = permission.status === "denied";
    return (
      <View style={styles.screen} testID="camera-permission-screen">
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}>
          <TopBar onBack={() => router.back()} />
          <Text style={styles.title}>{denied ? "Camera access needed" : "Allow camera access"}</Text>
          <Text style={styles.intro}>
            The camera is used to observe joint movement during the test. Video stays on this device and is not uploaded.
          </Text>

          <View style={styles.permissionCard}>
            <Ionicons name="camera-outline" size={28} color={colors.brandPrimary} />
            <Text style={styles.permissionTitle}>
              {blocked ? "Permission is blocked" : denied ? "Permission was declined" : "Camera permission"}
            </Text>
            <Text style={styles.permissionText}>
              {blocked
                ? "Camera access was turned off for this app. Enable it in system settings to run movement tests."
                : denied
                  ? "Without camera access the movement test cannot be observed. You can allow it now or continue without it."
                  : "Only the live preview is used. No photos or videos are stored."}
            </Text>
            {blocked ? (
                <Pressable onPress={() => Linking.openSettings()} testID="open-settings-button" accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Ionicons name="settings-outline" size={18} color={colors.onBrandPrimary} />
                  <Text style={styles.primaryText}>OPEN SETTINGS</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => requestPermission()} testID="request-permission-button" accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Ionicons name="camera-outline" size={18} color={colors.onBrandPrimary} />
                  <Text style={styles.primaryText}>{denied ? "TRY AGAIN" : "ALLOW CAMERA ACCESS"}</Text>
                </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => finish(0, null)}
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
  // Live camera + pose
  // ---------------------------------------------------------------------------
  const stateLabel =
    phase === "waiting"
      ? poseStage === "loading" ? "LOADING POSE MODEL" : "STARTING CAMERA"
      : phase === "ready" ? "READY"
        : phase === "assessing" ? "ASSESSING"
          : phase === "review" ? "QUALITY CHECK"
            : "SAVING";
  const stateTone = phase === "assessing" ? colors.warning : phase === "ready" ? colors.success : phase === "review" ? colors.error : colors.muted;
  const isGait = test === "gait_walk";
  const liveSlots: { key: string; label: string; value: number | null; unit: string }[] = [
    { key: "leftKnee", label: "Left knee", value: live?.leftKneeDeg ?? null, unit: "°" },
    { key: "rightKnee", label: "Right knee", value: live?.rightKneeDeg ?? null, unit: "°" },
    { key: "kneeRom", label: "Knee ROM", value: live?.kneeRomDeg ?? null, unit: "°" },
    isGait
      ? { key: "steps", label: "Steps", value: live?.steps ?? null, unit: "count" }
      : { key: "reps", label: "Repetitions", value: live?.repetitions ?? null, unit: "cycles" },
    isGait
      ? { key: "cadence", label: "Cadence", value: live?.cadenceStepsPerMin ?? null, unit: "steps/min" }
      : { key: "frames", label: "Frames", value: live?.frameCount ?? null, unit: "count" },
    { key: "visibility", label: "Pose visibility", value: live?.visibility === null || live?.visibility === undefined ? null : Math.round(live.visibility * 100), unit: "%" },
  ];

  return (
    <View style={styles.cameraScreen} testID="camera-assessment-screen">
      <StatusBar style="light" />
      <View style={styles.cameraArea}>
        <PoseCamera key={`${facing}-${cameraKey}`} facing={facing} onMessage={handlePoseMessage} />
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
          {poseError ? (
            <View style={styles.poseErrorCard} testID="pose-error">
              <Ionicons name="alert-circle-outline" size={22} color={colors.onSurfaceInverse} />
              <Text style={styles.poseErrorTitle}>Pose detection could not start</Text>
              <Text style={styles.poseErrorText}>{poseError}</Text>
              <Text style={styles.poseErrorText}>The pose model is downloaded once on first use and needs an internet connection that one time.</Text>
              <Pressable onPress={retryCamera} testID="pose-retry-button" accessibilityRole="button" style={({ pressed }) => [styles.overlayButton, pressed && styles.pressed]}>
                <Text style={styles.overlayButtonText}>RETRY</Text>
              </Pressable>
            </View>
          ) : phase === "waiting" ? (
            <View style={styles.poseLoading} testID="pose-loading">
              <ActivityIndicator color={colors.onSurfaceInverse} />
              <Text style={styles.overlayHint}>{poseStage === "loading" ? "Loading pose model… (downloads once, ~6 MB)" : "Starting camera…"}</Text>
            </View>
          ) : (
            <View style={styles.frameGuide} />
          )}
          <View style={styles.overlayBottom}>
            <Text style={[styles.overlayHint, styles.overlayHintGrow]}>{phase === "assessing" ? info.short : "Keep the whole body inside the frame"}</Text>
            <Pressable onPress={flipCamera} disabled={phase === "assessing"} hitSlop={8} accessibilityRole="button" accessibilityLabel="Switch camera" testID="flip-camera-button" style={({ pressed }) => [styles.flipButton, pressed && styles.pressed, phase === "assessing" && styles.disabled]}>
              <Ionicons name="camera-reverse-outline" size={20} color={colors.onSurfaceInverse} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{info.label.toUpperCase()}</Text>
          <Text style={styles.panelMeta}>{params.patientName || params.patientId}</Text>
        </View>

        {phase === "review" && pending ? (
          <View style={styles.reviewCard} testID="quality-review">
            <Text style={styles.reviewTitle}>Movement quality insufficient</Text>
            <Text style={styles.reviewText}>{pending.quality.note}</Text>
            <Text style={styles.reviewMeta}>
              {pending.features.frameCount ?? 0} frames · visibility {pending.quality.poseVisibility === null ? "--" : `${Math.round(pending.quality.poseVisibility * 100)}%`}
            </Text>
            <View style={styles.reviewActions}>
              <Pressable onPress={handleRetry} testID="quality-retry-button" accessibilityRole="button" style={({ pressed }) => [styles.secondaryButton, styles.reviewButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>RETRY</Text>
              </Pressable>
              <Pressable onPress={handleSavePending} testID="quality-save-anyway-button" accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, styles.reviewButton, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>SAVE AS INSUFFICIENT</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.metricGrid} testID="metric-grid">
              {liveSlots.map((slot) => (
                <View key={slot.key} style={styles.metric} testID={`metric-${slot.key}`}>
                  <Text style={styles.metricLabel}>{slot.label}</Text>
                  <Text style={styles.metricValue}>{formatMetric(slot.value, slot.unit)}</Text>
                  <Text style={styles.metricUnit}>{slot.unit}</Text>
                </View>
              ))}
            </View>

            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={15} color={colors.brandPrimary} />
              <Text style={styles.noticeText}>
                {phase === "assessing"
                  ? "Live values are measurements from on-device pose tracking. They are not a diagnosis."
                  : "Values fill in while the test runs. Final features are calculated when you complete the test."}
              </Text>
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
            {poseError && phase !== "saving" ? (
              <Pressable onPress={() => finish(0, null)} testID="continue-without-camera-button" accessibilityRole="button" style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>CONTINUE WITHOUT CAMERA</Text>
              </Pressable>
            ) : null}
          </>
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
  overlayHintGrow: { flex: 1 },
  overlayBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  flipButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceInverse, opacity: 0.92 },
  poseLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  poseErrorCard: {
    flex: 1,
    marginVertical: 18,
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.surfaceInverse,
    opacity: 0.94,
    justifyContent: "center",
    gap: 8,
  },
  poseErrorTitle: { color: colors.onSurfaceInverse, fontSize: 16, fontWeight: "800" },
  poseErrorText: { color: colors.onSurfaceInverse, fontSize: 13, lineHeight: 19, opacity: 0.85 },
  overlayButton: { minHeight: 44, marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  overlayButtonText: { color: colors.onSurfaceInverse, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  reviewCard: { marginTop: 14, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.surfaceSecondary },
  reviewTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  reviewText: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  reviewMeta: { color: colors.muted, fontSize: 12, marginTop: 8 },
  reviewActions: { flexDirection: "row", gap: 10 },
  reviewButton: { flex: 1, marginTop: 16 },

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
