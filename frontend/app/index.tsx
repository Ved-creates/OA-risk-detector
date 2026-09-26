import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAssessmentCount, storageEngine } from "@/src/utils/storage/assessmentStorage";
import { getPatientCount } from "@/src/utils/storage/patientStorage";
import { makeStyles, useTheme } from "@/src/theme";

type StatusTone = "success" | "warning" | "muted";

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [patientCount, setPatientCount] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [cameraPermission] = useCameraPermissions();

  useFocusEffect(
    useCallback(() => {
      getPatientCount().then(setPatientCount);
      getAssessmentCount().then(setAssessmentCount);
    }, []),
  );

  const cameraStatus: { value: string; tone: StatusTone } = cameraPermission?.granted
    ? { value: "Ready", tone: "success" }
    : cameraPermission?.status === "denied"
      ? { value: "Permission denied", tone: "warning" }
      : { value: "Not yet allowed", tone: "warning" };

  return (
    <View style={styles.screen} testID="home-screen">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 26, paddingBottom: insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.mark}>
            <Ionicons name="pulse-outline" size={19} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.eyebrow}>OFFLINE MOVEMENT SCREENING</Text>
        </View>

        <Text style={styles.title}>OA RISK{"\n"}DETECTOR</Text>
        <Text style={styles.subtitle}>Movement screening and assessment</Text>

        <View style={styles.rule} />

        <Pressable
          onPress={() => router.push("/patient-details")}
          testID="new-assessment-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.primaryLabel}>NEW ASSESSMENT</Text>
            <Text style={styles.primaryHint}>Begin with patient details</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color={colors.onBrandPrimary} />
        </Pressable>

        <View style={styles.secondaryActions}>
          <HomeLink icon="people-outline" label="PATIENTS" detail={`${patientCount} saved locally`} />
          <HomeLink
            icon="time-outline"
            label="HISTORY"
            detail={assessmentCount === 0 ? "No assessments yet" : `${assessmentCount} saved`}
            onPress={() => router.push("/history")}
            testID="home-history-link"
          />
          <HomeLink icon="settings-outline" label="SETTINGS" detail="Device and model status" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SYSTEM STATUS</Text>
          <Text style={styles.sectionMeta}>ON THIS DEVICE</Text>
        </View>

        <View style={styles.statusPanel}>
          <StatusRow icon="camera-outline" label="Camera" value={cameraStatus.value} tone={cameraStatus.tone} />
          <StatusRow icon="body-outline" label="Pose detection" value="MediaPipe · downloads on first use" tone="success" />
          <StatusRow icon="save-outline" label="Local storage" value={storageEngine === "sqlite" ? "SQLite on device" : "Available"} tone="success" />
          <StatusRow icon="hardware-chip-outline" label="ML model" value="Not installed" tone="muted" />
          <StatusRow icon="bluetooth-outline" label="BLE" value="Not connected" tone="muted" />
        </View>

        <View style={styles.note}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.brandPrimary} />
          <Text style={styles.noteText}>Patient information stays on this device.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function HomeLink({
  icon,
  label,
  detail,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}. ${detail}`}
      style={({ pressed }) => [styles.homeLink, pressed && onPress && styles.pressed]}
    >
      <Ionicons name={icon} size={21} color={colors.brandPrimary} />
      <Text style={styles.homeLinkLabel}>{label}</Text>
      <Text style={styles.homeLinkDetail}>{detail}</Text>
    </Pressable>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: StatusTone;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const toneColor = tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.muted;

  return (
    <View style={styles.statusRow}>
      <Ionicons name={icon} size={19} color={colors.onSurfaceSecondary} />
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={styles.statusValue}>
        <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
        <Text style={[styles.statusText, { color: toneColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandPrimary,
  },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  title: {
    color: colors.onSurface,
    fontFamily: "Georgia",
    fontSize: 36,
    lineHeight: 39,
    letterSpacing: -1,
    marginTop: 25,
  },
  subtitle: { color: colors.onSurfaceSecondary, fontSize: 16, marginTop: 14 },
  rule: { height: 1, backgroundColor: colors.divider, marginVertical: 28 },
  primaryAction: {
    minHeight: 82,
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderRadius: 14,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  primaryLabel: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  primaryHint: { color: colors.brandTertiary, fontSize: 13, marginTop: 7 },
  secondaryActions: { flexDirection: "row", gap: 9, marginTop: 13 },
  homeLink: {
    flex: 1,
    minHeight: 92,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
  },
  homeLinkLabel: { color: colors.onSurface, fontSize: 12, fontWeight: "800", marginTop: 12, letterSpacing: 0.5 },
  homeLinkDetail: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 35, marginBottom: 12 },
  sectionTitle: { color: colors.onSurface, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  sectionMeta: { color: colors.muted, fontSize: 10, letterSpacing: 1 },
  statusPanel: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider },
  statusRow: { minHeight: 57, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider },
  statusLabel: { color: colors.onSurfaceSecondary, fontSize: 15, marginLeft: 12, flex: 1 },
  statusValue: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  note: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 26 },
  noteText: { color: colors.muted, fontSize: 12 },
}));
