import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getVisibleQuestions } from "@/src/questionnaire/questions";
import { makeStyles, useTheme } from "@/src/theme";
import type { AnswerMap, Question } from "@/src/types/questionnaire";
import { loadDraft, saveDraft } from "@/src/utils/storage/questionnaireStorage";

export default function QuestionnaireReview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { patientId, patientName } = useLocalSearchParams<{ patientId?: string; patientName?: string }>();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setLoaded(true);
      return;
    }
    loadDraft(patientId).then((draft) => {
      if (draft?.answers) setAnswers(draft.answers);
      setLoaded(true);
    });
  }, [patientId]);

  const visible = useMemo(() => getVisibleQuestions(answers), [answers]);

  const handleEdit = () => router.back();

  const handleConfirm = async () => {
    if (!patientId) return;
    setSaving(true);
    await saveDraft(patientId, answers, true);
    setSaving(false);
    // Camera assessment route is Checkpoint 3. For now return to Home; the
    // completed questionnaire is persisted for the movement step to pick up.
    router.replace({
      pathname: "/",
      params: { patientId, patientName: patientName ?? "" },
    });
  };

  return (
    <View style={styles.screen} testID="questionnaire-review-screen">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="review-back-button"
          >
            <Ionicons name="arrow-back" size={21} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.stepLabel}>NEW ASSESSMENT · 02</Text>
        </View>

        <Text style={styles.title}>Review your answers</Text>
        <Text style={styles.intro}>
          These responses are stored on this device only. Movement measurements are collected in the next step.
        </Text>

        {patientName ? (
          <View style={styles.patientTag}>
            <Ionicons name="person-outline" size={14} color={colors.onSurfaceSecondary} />
            <Text style={styles.patientTagText}>{patientName}</Text>
          </View>
        ) : null}

        {!loaded ? (
          <Text style={styles.loading}>Loading answers…</Text>
        ) : visible.length === 0 ? (
          <Text style={styles.loading}>No answers recorded.</Text>
        ) : (
          groupBySection(visible).map((group) => (
            <View key={group.section} style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>{group.section.toUpperCase()}</Text>
              {group.questions.map((question) => (
                <View key={question.id} style={styles.row} testID={`review-${question.id}`}>
                  <Text style={styles.rowPrompt}>{question.prompt}</Text>
                  <Text style={styles.rowAnswer}>{formatAnswer(question, answers[question.id])}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.brandPrimary} />
          <Text style={styles.disclaimerText}>
            Responses are used to support later assessment steps. This questionnaire does not produce a diagnosis.
          </Text>
        </View>

        <Pressable
          onPress={handleEdit}
          testID="review-edit-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Ionicons name="create-outline" size={18} color={colors.onSurface} />
          <Text style={styles.secondaryText}>EDIT ANSWERS</Text>
        </Pressable>

        <Pressable
          onPress={handleConfirm}
          disabled={saving || !loaded}
          testID="review-confirm-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (saving || !loaded) && styles.disabled]}
        >
          <Text style={styles.primaryText}>{saving ? "SAVING…" : "CONFIRM & CONTINUE"}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
        </Pressable>

        <Text style={styles.footerHint}>
          The movement assessment step is added in the next checkpoint.
        </Text>
      </ScrollView>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function groupBySection(questions: Question[]) {
  const groups: { section: string; questions: Question[] }[] = [];
  for (const q of questions) {
    const last = groups[groups.length - 1];
    if (last && last.section === q.section) {
      last.questions.push(q);
    } else {
      groups.push({ section: q.section, questions: [q] });
    }
  }
  return groups;
}

function formatAnswer(question: Question, value: AnswerMap[string] | undefined): string {
  if (value === undefined || value === null) return "—";
  if (question.type === "scale" && typeof value === "number") return `${value} / ${question.max ?? 10}`;
  if (question.type === "multi" && Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((v) => question.options?.find((o) => o.value === v)?.label ?? v)
      .join(", ");
  }
  if (typeof value === "string") {
    return question.options?.find((o) => o.value === value)?.label ?? value;
  }
  return String(value);
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24 },
  topBar: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 30, marginTop: 22 },
  intro: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 370 },
  patientTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  patientTagText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  loading: { color: colors.muted, fontSize: 14, marginTop: 24 },
  sectionBlock: { marginTop: 28 },
  sectionTitle: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowPrompt: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19 },
  rowAnswer: { color: colors.onSurface, fontSize: 15, fontWeight: "600", marginTop: 4 },
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
  secondaryButton: {
    minHeight: 52,
    marginTop: 22,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryText: { color: colors.onSurface, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  primaryButton: {
    minHeight: 54,
    marginTop: 12,
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
  disabled: { opacity: 0.55 },
}));
