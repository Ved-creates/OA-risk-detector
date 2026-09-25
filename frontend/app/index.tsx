import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getPatientCount } from "@/src/utils/storage/patientStorage";
import { makeStyles, useTheme } from "@/src/theme";

type StatusTone = "success" | "warning" | "muted";

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [patientCount, setPatientCount] = useState(0);

  useEffect(() => {
    getPatientCount().then(setPatientCount);
  }, []);

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
          <HomeLink icon="time-outline" label="HISTORY" detail="No assessments yet" />
          <HomeLink icon="settings-outline" label="SETTINGS" detail="Device and model status" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SYSTEM STATUS</Text>
          <Text style={styles.sectionMeta}>ON THIS DEVICE</Text>
        </View>

        <View style={styles.statusPanel}>
          <StatusRow icon="camera-outline" label="Camera" value="Unavailable" tone="warning" />
          <StatusRow icon="save-outline" label="Local storage" value="Available" tone="success" />
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

function HomeLink({ icon, label, detail }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail: string }) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.homeLink} accessibilityLabel={`${label}. ${detail}`}>
      <Ionicons name={icon} size={21} color={colors.brandPrimary} />
      <Text style={styles.homeLinkLabel}>{label}</Text>
      <Text style={styles.homeLinkDetail}>{detail}</Text>
    </View>
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
