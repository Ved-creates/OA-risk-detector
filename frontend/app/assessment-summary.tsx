import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDate, qualityLabel } from "@/src/assessment/format";
import { METRIC_SLOTS, MOVEMENT_TEST_INFO } from "@/src/assessment/movementTests";
import { makeStyles, useTheme } from "@/src/theme";
import type { Assessment } from "@/src/types/assessment";
import { getAssessment } from "@/src/utils/storage/assessmentStorage";

export default function AssessmentSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { assessmentId } = useLocalSearchParams<{ assessmentId?: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      setLoaded(true);
      return;
    }
    getAssessment(assessmentId).then((a) => {
      setAssessment(a);
      setLoaded(true);
    });
  }, [assessmentId]);

  const testLabel = assessment ? MOVEMENT_TEST_INFO[assessment.movementTest]?.label ?? assessment.movementTest : "";

  return (
    <View style={styles.screen} testID="assessment-summary-screen">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.replace("/")} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go home" testID="summary-home-button">
            <Ionicons name="home-outline" size={21} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.stepLabel}>ASSESSMENT SUMMARY</Text>
        </View>

        {!loaded ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : !assessment ? (
          <Text style={styles.loading}>This assessment could not be found on this device.</Text>
        ) : (
          <>
            <View style={styles.savedBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <View style={styles.savedCopy}>
                <Text style={styles.savedTitle}>Saved on this device</Text>
                <Text style={styles.savedText}>{assessment.assessmentId}</Text>
              </View>
            </View>

            <Text style={styles.title}>{assessment.patientName || assessment.patientId}</Text>
            <Text style={styles.intro}>{formatDate(assessment.createdAt)}</Text>

            <View style={styles.infoGrid}>
              <InfoCell label="Body region" value={assessment.bodyRegion || "—"} />
              <InfoCell label="Movement test" value={testLabel} />
              <InfoCell label="Camera session" value={assessment.sessionDurationS > 0 ? `${assessment.sessionDurationS}s` : "Skipped"} />
              <InfoCell label="Questionnaire" value={`${assessment.questionnaire.answeredCount} answers`} />
            </View>

            <Text style={styles.sectionTitle}>MOVEMENT MEASUREMENTS</Text>
            <View style={styles.qualityRow} testID="quality-state">
              <View style={[styles.qualityDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.qualityText}>Quality: {qualityLabel(assessment.quality.state)}</Text>
            </View>
            <View style={styles.metricGrid}>
              {METRIC_SLOTS.map((slot) => (
                <View key={slot.key} style={styles.metric}>
                  <Text style={styles.metricLabel}>{slot.label}</Text>
                  <Text style={styles.metricValue}>--</Text>
                  <Text style={styles.metricUnit}>{slot.unit || "Not available"}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.qualityNote}>{assessment.quality.note}</Text>

            <Text style={styles.sectionTitle}>PERSONAL BASELINE</Text>
            <Text style={styles.baselineText}>
              A baseline is created from this person&apos;s previous measured assessments. No measured values exist yet, so no comparison is shown.
            </Text>

            <View style={styles.disclaimer} testID="summary-disclaimer">
              <Ionicons name="information-circle-outline" size={16} color={colors.brandPrimary} />
              <Text style={styles.disclaimerText}>
                Not a diagnosis. This record supports screening and referral decisions by a qualified professional. It does not estimate osteoarthritis risk or probability.
              </Text>
            </View>

            <Pressable onPress={() => router.replace("/history")} testID="summary-history-button" accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Ionicons name="time-outline" size={18} color={colors.onBrandPrimary} />
              <Text style={styles.primaryText}>VIEW HISTORY</Text>
            </Pressable>
            <Pressable onPress={() => router.replace("/")} testID="summary-done-button" accessibilityRole="button" style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>BACK TO HOME</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24 },
  topBar: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  loading: { color: colors.muted, fontSize: 14, marginTop: 24 },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.surfaceSecondary,
    marginTop: 18,
  },
  savedCopy: { marginLeft: 10 },
  savedTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  savedText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 28, marginTop: 24 },
  intro: { color: colors.onSurfaceSecondary, fontSize: 14, marginTop: 6 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  infoCell: { width: "48%", flexGrow: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  infoLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  infoValue: { color: colors.onSurface, fontSize: 15, fontWeight: "700", marginTop: 4 },
  sectionTitle: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginTop: 30, marginBottom: 10 },
  qualityRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  qualityDot: { width: 8, height: 8, borderRadius: 4 },
  qualityText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "31%", flexGrow: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  metricValue: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 22, marginTop: 4 },
  metricUnit: { color: colors.muted, fontSize: 10, marginTop: 2 },
  qualityNote: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  baselineText: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 26,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  disclaimerText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 54,
    marginTop: 22,
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
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: colors.onSurface, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
}));
