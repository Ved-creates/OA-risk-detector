import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDate, qualityLabel } from "@/src/assessment/format";
import { MOVEMENT_TEST_INFO } from "@/src/assessment/movementTests";
import { makeStyles, useTheme } from "@/src/theme";
import type { Assessment } from "@/src/types/assessment";
import { getAssessments, getAssessmentsForPatient } from "@/src/utils/storage/assessmentStorage";

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const [items, setItems] = useState<Assessment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = patientId ? await getAssessmentsForPatient(patientId) : await getAssessments();
    setItems(list);
    setLoaded(true);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen} testID="history-screen">
      <StatusBar style="dark" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.assessmentId}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back" testID="history-back-button">
                <Ionicons name="arrow-back" size={21} color={colors.onSurface} />
              </Pressable>
              <Text style={styles.stepLabel}>{patientId ? "PATIENT HISTORY" : "HISTORY"}</Text>
            </View>
            <Text style={styles.title}>Saved assessments</Text>
            <Text style={styles.intro}>
              {loaded ? `${items.length} record${items.length === 1 ? "" : "s"} stored on this device.` : "Loading…"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty} testID="history-empty">
              <Ionicons name="time-outline" size={30} color={colors.muted} />
              <Text style={styles.emptyTitle}>No assessments yet</Text>
              <Text style={styles.emptyText}>Completed assessments appear here. Nothing is pre-filled or simulated.</Text>
              <Pressable onPress={() => router.push("/patient-details")} testID="history-new-button" accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>NEW ASSESSMENT</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/assessment-summary", params: { assessmentId: item.assessmentId } })}
            testID={`history-item-${item.assessmentId}`}
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{item.patientName || item.patientId}</Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.cardMeta}>
              {item.bodyRegion || "—"} · {MOVEMENT_TEST_INFO[item.movementTest]?.label ?? item.movementTest}
            </Text>
            <View style={styles.cardBottom}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: item.quality.state === "VALID" ? colors.success : colors.warning }]} />
                <Text style={styles.statusText}>Camera metrics: {qualityLabel(item.quality.state)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Pressable>
        )}
      />
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
  intro: { color: colors.onSurfaceSecondary, fontSize: 14, marginTop: 10, marginBottom: 18 },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 12 },
  emptyTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginTop: 14 },
  emptyText: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8, maxWidth: 300 },
  primaryButton: {
    minHeight: 48,
    marginTop: 22,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  card: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardName: { flex: 1, color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  cardDate: { color: colors.muted, fontSize: 12 },
  cardMeta: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 6 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.78 },
}));
