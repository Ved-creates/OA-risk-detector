import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getVisibleQuestions, QUESTIONS } from "@/src/questionnaire/questions";
import { makeStyles, useTheme } from "@/src/theme";
import type { AnswerMap, AnswerValue, Question } from "@/src/types/questionnaire";
import { loadDraft, saveDraft } from "@/src/utils/storage/questionnaireStorage";

type Direction = "forward" | "backward";

export default function QuestionnaireScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { patientId, patientName } = useLocalSearchParams<{ patientId?: string; patientName?: string }>();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>("forward");
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate any existing draft for this patient (in-progress answers persist).
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    loadDraft(patientId).then((draft) => {
      if (cancelled) return;
      if (draft?.answers) setAnswers(draft.answers);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Persist answers whenever they change (debounced, offline).
  useEffect(() => {
    if (!hydrated || !patientId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDraft(patientId, answers, false);
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, patientId, hydrated]);

  const visibleQuestions = useMemo(() => getVisibleQuestions(answers), [answers]);
  const total = visibleQuestions.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const currentQuestion: Question | undefined = visibleQuestions[safeIndex];

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const hasAnswer = isAnswered(currentQuestion, currentAnswer);
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === total - 1;

  const setAnswer = useCallback(
    (question: Question, value: AnswerValue) => {
      setAnswers((current) => {
        const next: AnswerMap = { ...current, [question.id]: value };
        // If Q10 changes away from "yes", clear injury follow-ups so they do
        // not leak into review or storage.
        if (question.id === "q10" && value !== "yes") {
          delete next.q10a;
          delete next.q10b;
        }
        if (question.id === "q14" && value !== "yes") {
          delete next.q14a;
        }
        return next;
      });
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (!currentQuestion || !hasAnswer) return;
    if (isLast) {
      // Persist immediately so review reads the latest answers.
      if (patientId) void saveDraft(patientId, answers, false);
      router.push({
        pathname: "/questionnaire-review",
        params: {
          patientId: patientId ?? "",
          patientName: patientName ?? "",
        },
      });
      return;
    }
    setDirection("forward");
    setIndex((i) => i + 1);
  }, [currentQuestion, hasAnswer, isLast, patientId, patientName, answers, router]);

  const handleBack = useCallback(() => {
    if (isFirst) return;
    setDirection("backward");
    setIndex((i) => Math.max(0, i - 1));
  }, [isFirst]);

  const handleExit = useCallback(() => {
    router.back();
  }, [router]);

  if (!currentQuestion) {
    return (
      <View style={styles.screen} testID="questionnaire-screen">
        <StatusBar style="dark" />
        <View style={[styles.emptyState, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.title}>Questionnaire</Text>
          <Text style={styles.intro}>No questions available.</Text>
        </View>
      </View>
    );
  }

  const progress = total > 0 ? (safeIndex + 1) / total : 0;
  const displayNumber = (safeIndex + 1).toString().padStart(2, "0");
  const displayTotal = total.toString().padStart(2, "0");

  return (
    <View style={styles.screen} testID="questionnaire-screen">
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable
          onPress={handleExit}
          style={styles.iconButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Exit questionnaire"
          testID="questionnaire-exit-button"
        >
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>QUESTION {displayNumber} / {displayTotal}</Text>
          <Text style={styles.headerSection}>{currentQuestion.section.toUpperCase()}</Text>
        </View>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.body}>
        <Animated.View
          // Re-mount on question change so enter/exit animations run.
          key={currentQuestion.id}
          entering={direction === "forward" ? SlideInRight.duration(260) : SlideInLeft.duration(260)}
          exiting={direction === "forward" ? SlideOutLeft.duration(220) : SlideOutRight.duration(220)}
          style={styles.questionCard}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.questionScroll}
          >
            <Text style={styles.questionNumber}>{displayNumber}</Text>
            <Text style={styles.questionPrompt} testID="question-prompt">
              {currentQuestion.prompt}
            </Text>
            {currentQuestion.helper ? (
              <Text style={styles.questionHelper}>{currentQuestion.helper}</Text>
            ) : null}

            <View style={styles.answers}>
              {currentQuestion.type === "single" ? (
                <SingleChoice
                  question={currentQuestion}
                  value={typeof currentAnswer === "string" ? currentAnswer : undefined}
                  onSelect={(v) => setAnswer(currentQuestion, v)}
                />
              ) : null}
              {currentQuestion.type === "multi" ? (
                <MultiChoice
                  question={currentQuestion}
                  value={Array.isArray(currentAnswer) ? currentAnswer : []}
                  onSelect={(v) => setAnswer(currentQuestion, v)}
                />
              ) : null}
              {currentQuestion.type === "scale" ? (
                <ScaleChoice
                  question={currentQuestion}
                  value={typeof currentAnswer === "number" ? currentAnswer : undefined}
                  onSelect={(v) => setAnswer(currentQuestion, v)}
                />
              ) : null}
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.duration(200)} style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(6, progress * 100)}%` }]} />
        </View>
        <View style={styles.footerActions}>
          <Pressable
            onPress={handleBack}
            disabled={isFirst}
            testID="questionnaire-back-button"
            accessibilityRole="button"
            style={({ pressed }) => [styles.backButton, isFirst && styles.disabled, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={18} color={isFirst ? colors.muted : colors.onSurface} />
            <Text style={[styles.backText, isFirst && styles.disabledText]}>BACK</Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            disabled={!hasAnswer}
            testID="questionnaire-next-button"
            accessibilityRole="button"
            style={({ pressed }) => [styles.nextButton, !hasAnswer && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.nextText}>{isLast ? "REVIEW ANSWERS" : "NEXT"}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Answer components
// -----------------------------------------------------------------------------

function SingleChoice({
  question,
  value,
  onSelect,
}: {
  question: Question;
  value: string | undefined;
  onSelect: (value: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.optionList}>
      {question.options?.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            testID={`question-${question.id}-option-${option.value}`}
            style={({ pressed }) => [styles.optionRow, selected && styles.optionRowSelected, pressed && styles.optionPressed]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
            {selected ? (
              <Ionicons name="checkmark" size={18} color={colors.brandPrimary} style={styles.optionCheck} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiChoice({
  question,
  value,
  onSelect,
}: {
  question: Question;
  value: string[];
  onSelect: (value: string[]) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  const toggle = (optionValue: string) => {
    // "None of these" is exclusive.
    if (optionValue === "none") {
      onSelect(value.includes("none") ? [] : ["none"]);
      return;
    }
    const withoutNone = value.filter((v) => v !== "none");
    if (withoutNone.includes(optionValue)) {
      onSelect(withoutNone.filter((v) => v !== optionValue));
    } else {
      onSelect([...withoutNone, optionValue]);
    }
  };

  return (
    <View style={styles.optionList}>
      {question.options?.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => toggle(option.value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            testID={`question-${question.id}-option-${option.value}`}
            style={({ pressed }) => [styles.optionRow, selected && styles.optionRowSelected, pressed && styles.optionPressed]}
          >
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected ? <Ionicons name="checkmark" size={14} color={colors.onBrandPrimary} /> : null}
            </View>
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScaleChoice({
  question,
  value,
  onSelect,
}: {
  question: Question;
  value: number | undefined;
  onSelect: (value: number) => void;
}) {
  const styles = useStyles();
  const min = question.min ?? 0;
  const max = question.max ?? 10;
  const items = useMemo(() => {
    const out: number[] = [];
    for (let i = min; i <= max; i += 1) out.push(i);
    return out;
  }, [min, max]);

  return (
    <View style={styles.scaleWrap}>
      <View style={styles.scaleValueRow}>
        <Text style={styles.scaleValue} testID="question-scale-value">
          {typeof value === "number" ? value : "--"}
        </Text>
        <Text style={styles.scaleValueSuffix}>/ {max}</Text>
      </View>
      <View style={styles.scaleRow}>
        {items.map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onSelect(n)}
              accessibilityRole="button"
              accessibilityLabel={`Rating ${n}`}
              testID={`question-${question.id}-scale-${n}`}
              style={({ pressed }) => [styles.scaleDot, selected && styles.scaleDotSelected, pressed && styles.optionPressed]}
            >
              <Text style={[styles.scaleDotText, selected && styles.scaleDotTextSelected]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scaleLegend}>
        <Text style={styles.scaleLegendText}>{question.minLabel ?? min}</Text>
        <Text style={styles.scaleLegendText}>{question.maxLabel ?? max}</Text>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isAnswered(question: Question | undefined, value: AnswerValue | undefined): boolean {
  if (!question) return false;
  if (question.type === "single") return typeof value === "string" && value.length > 0;
  if (question.type === "multi") return Array.isArray(value) && value.length > 0;
  if (question.type === "scale") return typeof value === "number";
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- exported for future extension
const _QUESTION_COUNT = QUESTIONS.length;

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", paddingTop: 8 },
  headerEyebrow: { color: colors.brandPrimary, fontSize: 12, fontWeight: "800", letterSpacing: 1.3 },
  headerSection: { color: colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.1, marginTop: 4 },
  body: { flex: 1, overflow: "hidden" },
  questionCard: { flex: 1, paddingHorizontal: 26 },
  questionScroll: { paddingTop: 30, paddingBottom: 40 },
  questionNumber: {
    color: colors.brandPrimary,
    fontFamily: "Georgia",
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -1,
    marginBottom: 14,
  },
  questionPrompt: {
    color: colors.onSurface,
    fontFamily: "Georgia",
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  questionHelper: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  answers: { marginTop: 28 },
  emptyState: { flex: 1, paddingHorizontal: 24 },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 28 },
  intro: { color: colors.onSurfaceSecondary, marginTop: 12 },
  // Options
  optionList: { gap: 10 },
  optionRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionRowSelected: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
  },
  optionPressed: { opacity: 0.85 },
  optionText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "500" },
  optionTextSelected: { color: colors.onBrandTertiary, fontWeight: "700" },
  optionCheck: { marginLeft: 8 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.brandPrimary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brandPrimary },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary },
  // Scale
  scaleWrap: { marginTop: 6 },
  scaleValueRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", marginBottom: 22 },
  scaleValue: { color: colors.brandPrimary, fontFamily: "Georgia", fontSize: 64, lineHeight: 66, letterSpacing: -1.5 },
  scaleValueSuffix: { color: colors.muted, fontSize: 18, marginLeft: 8 },
  scaleRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  scaleDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  scaleDotSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  scaleDotText: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "700" },
  scaleDotTextSelected: { color: colors.onBrandPrimary },
  scaleLegend: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, paddingHorizontal: 6 },
  scaleLegendText: { color: colors.muted, fontSize: 12, letterSpacing: 0.5 },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.divider,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: { height: "100%", backgroundColor: colors.brandPrimary },
  footerActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backText: { color: colors.onSurface, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  disabledText: { color: colors.muted },
  nextButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nextText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
}));
