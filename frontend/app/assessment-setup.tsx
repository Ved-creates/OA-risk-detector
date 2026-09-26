import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FRAMING_TIPS, MOVEMENT_TEST_INFO } from "@/src/assessment/movementTests";
import { makeStyles, useTheme } from "@/src/theme";
import { MOVEMENT_TESTS, type MovementTest } from "@/src/types/assessment";
import { getPatients } from "@/src/utils/storage/patientStorage";

export default function AssessmentSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { patientId, patientName } = useLocalSearchParams<{ patientId?: string; patientName?: string }>();

  const [bodyRegion, setBodyRegion] = useState<string>("");
  const [test, setTest] = useState<MovementTest>("sit_to_stand");

  useEffect(() => {
    if (!patientId) return;
    getPatients().then((patients) => {
      const patient = patients.find((p) => p.patientId === patientId);
      if (patient) setBodyRegion(patient.bodyRegion);
    });
  }, [patientId]);

  const info = MOVEMENT_TEST_INFO[test];

  const handleStart = () => {
    router.push({
      pathname: "/camera-assessment",
      params: { patientId: patientId ?? "", patientName: patientName ?? "", bodyRegion, test },
    });
  };

  return (
    <View style={styles.screen} testID="assessment-setup-screen">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="setup-back-button"
          >
            <Ionicons name="arrow-back" size={21} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.stepLabel}>NEW ASSESSMENT · 03</Text>
        </View>

        <Text style={styles.title}>Assessment setup</Text>
        <Text style={styles.intro}>
          Choose a movement test and prepare the space. The camera records movement measurements only.
        </Text>

        <View style={styles.tagRow}>
          {patientName ? (
            <View style={styles.tag}>
              <Ionicons name="person-outline" size={14} color={colors.onSurfaceSecondary} />
              <Text style={styles.tagText}>{patientName}</Text>
            </View>
          ) : null}
          {bodyRegion ? (
            <View style={styles.tag}>
              <Ionicons name="body-outline" size={14} color={colors.onSurfaceSecondary} />
              <Text style={styles.tagText}>{bodyRegion}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>MOVEMENT TEST</Text>
        <View style={styles.testGrid}>
          {MOVEMENT_TESTS.map((id) => {
            const selected = id === test;
            return (
              <Pressable
                key={id}
                onPress={() => setTest(id)}
                testID={`test-option-${id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.testChip, selected && styles.testChipSelected, pressed && styles.chipPressed]}
              >
                <Text style={[styles.testChipLabel, selected && styles.testChipLabelSelected]}>{MOVEMENT_TEST_INFO[id].label}</Text>
                <Text style={[styles.testChipShort, selected && styles.testChipLabelSelected]}>{MOVEMENT_TEST_INFO[id].short}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card} testID="movement-instructions-card">
          <View style={styles.cardHeader}>
            <Ionicons name="walk-outline" size={18} color={colors.brandPrimary} />
            <Text style={styles.cardTitle}>HOW TO MOVE · {info.label.toUpperCase()}</Text>
          </View>
          {info.steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="scan-outline" size={18} color={colors.brandPrimary} />
            <Text style={styles.cardTitle}>CAMERA PLACEMENT</Text>
          </View>
          {FRAMING_TIPS.map((tip) => (
            <View key={tip.title} style={styles.tipRow}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDetail}>{tip.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.brandPrimary} />
          <Text style={styles.disclaimerText}>
            Movement measurements support screening and referral decisions. They are not a diagnosis. Stop if you feel pain.
          </Text>
        </View>

        <Pressable
          onPress={handleStart}
          testID="start-camera-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Ionicons name="camera-outline" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.primaryText}>START CAMERA</Text>
        </Pressable>
        <Text style={styles.footerHint}>Camera access is requested on the next screen.</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24 },
  topBar: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 30, marginTop: 22 },
  intro: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 370 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  tagText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  sectionTitle: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginTop: 30, marginBottom: 12 },
  testGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  testChip: {
    width: "48%",
    flexGrow: 1,
    minHeight: 72,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  testChipSelected: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  chipPressed: { opacity: 0.75 },
  testChipLabel: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  testChipShort: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  testChipLabelSelected: { color: colors.onBrandTertiary },
  card: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  cardTitle: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 7 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "800",
    color: colors.onBrandPrimary,
    backgroundColor: colors.brandPrimary,
  },
  stepText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
  tipRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.divider },
  tipTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  tipDetail: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 22 },
  disclaimerText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 54,
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  footerHint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 14 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
}));
