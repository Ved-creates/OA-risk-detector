# OA Risk Detector — complete source (Expo / React Native, offline)

Generated 2026-09-26. Config: app.json, package.json, tsconfig.json. Screens in app/, logic in src/.

---

## `frontend/app/_layout.tsx`

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true)

export default function RootLayout() {
  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

---

## `frontend/app/index.tsx`

```tsx
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
```

---

## `frontend/app/patient-details.tsx`

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BODY_REGIONS, type BodyRegion } from "@/src/types/patient";
import { makeStyles, useTheme } from "@/src/theme";
import { savePatient } from "@/src/utils/storage/patientStorage";

type FormState = {
  patientId: string;
  name: string;
  age: string;
  sex: string;
  height: string;
  weight: string;
  bodyRegion: BodyRegion | "";
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const SEX_OPTIONS = ["Female", "Male", "Intersex", "Prefer not to say"];

export default function PatientDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const [form, setForm] = useState<FormState>({ patientId: "", name: "", age: "", sex: "", height: "", weight: "", bodyRegion: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedPatientId, setSavedPatientId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setStorageError(false);
  };

  const handleContinue = async () => {
    if (savedPatientId) {
      router.replace({
        pathname: "/questionnaire",
        params: { patientId: savedPatientId, patientName: form.name.trim() },
      });
      return;
    }

    const nextErrors: FormErrors = {};
    const age = Number(form.age);
    const height = Number(form.height);
    const weight = Number(form.weight);

    if (!form.name.trim()) nextErrors.name = "Enter the patient name.";
    if (!Number.isInteger(age) || age < 1 || age > 120) nextErrors.age = "Enter an age between 1 and 120.";
    if (!form.sex) nextErrors.sex = "Select an option.";
    if (!Number.isFinite(height) || height <= 0) nextErrors.height = "Enter height in centimetres.";
    if (!Number.isFinite(weight) || weight <= 0) nextErrors.weight = "Enter weight in kilograms.";
    if (!form.bodyRegion) nextErrors.bodyRegion = "Select a body region.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const patientId = form.patientId.trim() || generatePatientId();
    setSaving(true);
    setStorageError(false);
    try {
      const didSave = await savePatient({
        patientId,
        name: form.name.trim(),
        age,
        sex: form.sex,
        height,
        weight,
        bodyRegion: form.bodyRegion as BodyRegion,
        createdAt: new Date().toISOString(),
      });
      if (!didSave) {
        setStorageError(true);
        return;
      }
      setSavedPatientId(patientId);
    } catch {
      setStorageError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen} testID="patient-details-screen">
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} testID="patient-back-button" style={styles.backButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={21} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.stepLabel}>NEW ASSESSMENT · 01</Text>
          </View>

          <Text style={styles.title}>Patient details</Text>
          <Text style={styles.intro}>Record the person being assessed. Required fields are marked by the form validation.</Text>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>IDENTIFICATION</Text>
            <Field label="Patient ID" value={form.patientId} placeholder="Leave blank to generate" onChangeText={(value) => update("patientId", value)} autoCapitalize="characters" />
            <Text style={styles.helper}>A local identifier is generated if none is entered.</Text>
            <Field label="Name" required value={form.name} placeholder="Full name" onChangeText={(value) => update("name", value)} error={errors.name} />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>BASIC MEASUREMENTS</Text>
            <View style={styles.twoColumn}>
              <View style={styles.columnField}>
                <Field label="Age" required value={form.age} placeholder="Years" onChangeText={(value) => update("age", value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" error={errors.age} />
              </View>
              <View style={styles.columnField}>
                <Field label="Sex" required value={form.sex} placeholder="Select below" editable={false} error={errors.sex} />
              </View>
            </View>
            <View style={styles.chipWrap}>
              {SEX_OPTIONS.map((option) => (
                <ChoiceChip key={option} label={option} selected={form.sex === option} onPress={() => update("sex", option)} testID={`sex-option-${option.toLowerCase().replace(/\s+/g, "-")}`} />
              ))}
            </View>
            <View style={styles.twoColumn}>
              <View style={styles.columnField}>
                <Field label="Height" required value={form.height} placeholder="cm" onChangeText={(value) => update("height", value.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" error={errors.height} />
              </View>
              <View style={styles.columnField}>
                <Field label="Weight" required value={form.weight} placeholder="kg" onChangeText={(value) => update("weight", value.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" error={errors.weight} />
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>BODY REGION</Text>
            <Text style={styles.fieldLabel}>Area being assessed <Text style={styles.required}>*</Text></Text>
            <View style={styles.regionGrid}>
              {BODY_REGIONS.map((region) => (
                <ChoiceChip key={region} label={region} selected={form.bodyRegion === region} onPress={() => update("bodyRegion", region)} testID={`body-region-${region.toLowerCase().replace(/\s+/g, "-")}`} wide />
              ))}
            </View>
            {errors.bodyRegion ? <Text style={styles.errorText}>{errors.bodyRegion}</Text> : null}
          </View>

          {savedPatientId ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <View style={styles.successCopy}>
                <Text style={styles.successTitle}>Patient saved locally</Text>
                <Text style={styles.successText}>{savedPatientId}</Text>
              </View>
            </View>
          ) : null}
          {storageError ? <Text style={styles.errorText}>The patient could not be saved on this device. Please try again.</Text> : null}

          <Pressable
            onPress={handleContinue}
            disabled={saving}
            testID="continue-patient-button"
            accessibilityRole="button"
            style={({ pressed }) => [styles.continueButton, pressed && styles.pressed, saving && styles.disabled]}
          >
            {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.continueText}>{savedPatientId ? "CONTINUE TO QUESTIONNAIRE" : "CONTINUE"}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  required,
  value,
  placeholder,
  onChangeText,
  error,
  editable = true,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  onChangeText?: (value: string) => void;
  error?: string;
  editable?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label} {required ? <Text style={styles.required}>*</Text> : null}</Text>
      <TextInput
        value={value}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        testID={`patient-input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        style={[styles.input, error && styles.inputError, !editable && styles.inputDisabled]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function ChoiceChip({ label, selected, onPress, wide = false, testID }: { label: string; selected: boolean; onPress: () => void; wide?: boolean; testID?: string }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="radio" accessibilityState={{ selected }} style={({ pressed }) => [styles.chip, wide && styles.regionChip, selected && styles.chipSelected, pressed && styles.chipPressed]}>
      {selected ? <Ionicons name="checkmark" size={14} color={styles.chipSelectedText.color as string} /> : null}
      <Text style={[styles.chipText, selected && styles.chipSelectedText]}>{label}</Text>
    </Pressable>
  );
}

function generatePatientId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OA-${datePart}-${randomPart}`;
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24 },
  topBar: { minHeight: 44, flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  stepLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 31, marginTop: 28 },
  intro: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 23, marginTop: 12, maxWidth: 370 },
  formSection: { marginTop: 33 },
  sectionTitle: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 17 },
  helper: { color: colors.muted, fontSize: 12, marginTop: -8, marginBottom: 17 },
  fieldBlock: { flex: 1, marginBottom: 17 },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  required: { color: colors.error },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, color: colors.onSurface, backgroundColor: colors.surfaceSecondary, paddingHorizontal: 13, fontSize: 15 },
  inputError: { borderColor: colors.error },
  inputDisabled: { color: colors.muted },
  errorText: { color: colors.error, fontSize: 12, marginTop: 6, lineHeight: 17 },
  twoColumn: { flexDirection: "row", gap: 12 },
  columnField: { flex: 1 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -3, marginBottom: 17 },
  chip: { minHeight: 44, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  regionChip: { flexGrow: 1, minWidth: "30%" },
  chipSelected: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  chipPressed: { opacity: 0.75 },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  chipSelectedText: { color: colors.onBrandTertiary, fontWeight: "800" },
  regionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  successBanner: { flexDirection: "row", alignItems: "center", padding: 15, borderRadius: 10, borderWidth: 1, borderColor: colors.success, backgroundColor: colors.surfaceSecondary, marginTop: 28 },
  successCopy: { marginLeft: 10 },
  successTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  successText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  continueButton: { minHeight: 54, borderRadius: 10, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 28 },
  continueText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.6 },
}));```

---

## `frontend/app/questionnaire.tsx`

```tsx
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
```

---

## `frontend/app/questionnaire-review.tsx`

```tsx
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
    router.push({
      pathname: "/assessment-setup",
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
          Next: assessment setup and camera movement test.
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
```

---

## `frontend/app/assessment-setup.tsx`

```tsx
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
        <Text style={styles.footerHint}>Camera access is requested on the next screen. The pose model downloads once on first use.</Text>
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
```

---

## `frontend/app/camera-assessment.tsx`

```tsx
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
```

---

## `frontend/app/assessment-summary.tsx`

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getBaseline, type Baseline } from "@/src/assessment/baseline";
import { formatDate, qualityLabel } from "@/src/assessment/format";
import { formatMetric, metricValue, slotsForTest } from "@/src/assessment/metrics";
import { MOVEMENT_TEST_INFO } from "@/src/assessment/movementTests";
import { makeStyles, useTheme } from "@/src/theme";
import type { Assessment } from "@/src/types/assessment";
import { getAssessment, getFrameSeriesCount, storageEngine } from "@/src/utils/storage/assessmentStorage";

export default function AssessmentSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { assessmentId } = useLocalSearchParams<{ assessmentId?: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      setLoaded(true);
      return;
    }
    getAssessment(assessmentId).then(async (a) => {
      setAssessment(a);
      if (a) {
        const [b, n] = await Promise.all([getBaseline(a), getFrameSeriesCount(a.assessmentId)]);
        setBaseline(b);
        setFrameCount(n);
      }
      setLoaded(true);
    });
  }, [assessmentId]);

  const testLabel = assessment ? MOVEMENT_TEST_INFO[assessment.movementTest]?.label ?? assessment.movementTest : "";
  const slots = assessment ? slotsForTest(assessment.movementTest) : [];
  const previous = baseline?.previous ?? [];
  const qualityTone = assessment?.quality.state === "VALID" ? colors.success : assessment?.quality.state === "INSUFFICIENT" ? colors.error : colors.warning;

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
              <View style={[styles.qualityDot, { backgroundColor: qualityTone }]} />
              <Text style={styles.qualityText}>Quality: {qualityLabel(assessment.quality.state)}</Text>
            </View>
            <View style={styles.metricGrid}>
              {slots.map((slot) => (
                <View key={slot.key} style={styles.metric} testID={`summary-metric-${slot.key}`}>
                  <Text style={styles.metricLabel}>{slot.label}</Text>
                  <Text style={styles.metricValue}>{formatMetric(metricValue(assessment, slot.key), slot.unit)}</Text>
                  <Text style={styles.metricUnit}>{slot.unit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.qualityNote}>{assessment.quality.note}</Text>
            <Text style={styles.qualityNote}>
              Provider: {assessment.cameraFeatures.provider === "mediapipe_webview" ? "MediaPipe pose (on device)" : "none"} · {frameCount} raw frames stored separately · {storageEngine === "sqlite" ? "SQLite" : "local storage"}
            </Text>

            <Text style={styles.sectionTitle}>PERSONAL BASELINE</Text>
            {previous.length === 0 ? (
              <Text style={styles.baselineText} testID="baseline-empty">
                {assessment.quality.state === "VALID"
                  ? "This is the first valid measured " + testLabel.toLowerCase() + " assessment for this person. Later assessments will be shown next to it."
                  : "A baseline is built from this person's earlier valid measured assessments of the same test. None are available for comparison."}
              </Text>
            ) : (
              <View testID="baseline-table">
                <Text style={styles.baselineText}>
                  Values from this person&apos;s earlier valid {testLabel.toLowerCase()} assessments, shown side by side. No comparison score is calculated.
                </Text>
                <View style={styles.baselineHeader}>
                  <Text style={[styles.baselineCell, styles.baselineLabelCell, styles.baselineHeaderText]}>Metric</Text>
                  <Text style={[styles.baselineCell, styles.baselineHeaderText]}>This</Text>
                  {previous.slice(0, 2).map((p) => (
                    <Text key={p.assessmentId} style={[styles.baselineCell, styles.baselineHeaderText]}>{shortDate(p.createdAt)}</Text>
                  ))}
                </View>
                {slots.map((slot) => (
                  <View key={slot.key} style={styles.baselineRow}>
                    <Text style={[styles.baselineCell, styles.baselineLabelCell, styles.baselineLabel]}>{slot.label}{slot.unit ? ` (${slot.unit})` : ""}</Text>
                    <Text style={[styles.baselineCell, styles.baselineValue]}>{formatMetric(metricValue(assessment, slot.key), slot.unit)}</Text>
                    {previous.slice(0, 2).map((p) => (
                      <Text key={p.assessmentId} style={[styles.baselineCell, styles.baselineValue]}>{formatMetric(metricValue(p, slot.key), slot.unit)}</Text>
                    ))}
                  </View>
                ))}
                <Text style={styles.qualityNote}>{previous.length} earlier valid assessment{previous.length === 1 ? "" : "s"} on record.</Text>
              </View>
            )}

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

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  baselineHeader: { flexDirection: "row", marginTop: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderStrong },
  baselineHeaderText: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  baselineRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  baselineCell: { flex: 1, textAlign: "right" },
  baselineLabelCell: { flex: 2, textAlign: "left" },
  baselineLabel: { color: colors.onSurfaceSecondary, fontSize: 13 },
  baselineValue: { color: colors.onSurface, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
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
```

---

## `frontend/app/history.tsx`

```tsx
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
```

---

## `frontend/src/theme.ts`

```ts
// Design tokens for the OA Risk Detector clinical interface.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // ---------------------------------------------------------------------------
  // Surfaces: backgrounds, from the screen down to small fills.
  // Each `on` key is the text and icon color for that background.
  // ---------------------------------------------------------------------------
  surface: "#F9F6F0",
  onSurface: "#2C2A29",
  surfaceSecondary: "#F2EFE9",
  onSurfaceSecondary: "#4A4745",
  surfaceTertiary: "#EAE5DC",
  onSurfaceTertiary: "#6B6764",
  surfaceInverse: "#1C1B1A",
  onSurfaceInverse: "#F9F6F0",
  muted: "#7A7570",

  // ---------------------------------------------------------------------------
  // Brand: the identity color and the fills built from it.
  // Neutral by default; replace with the design guidelines values.
  // ---------------------------------------------------------------------------
  brand: "#8B7D6B",
  onBrand: "#FFFFFF",
  brandPrimary: "#6E5E4E",
  onBrandPrimary: "#FFFFFF", // text and icons on brandPrimary
  brandSecondary: "#8B7D6B",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#D6CEC2",
  onBrandTertiary: "#3B342B",

  // ---------------------------------------------------------------------------
  // Status: semantic only, never decorative. Fill for badges, banners and
  // toasts; the `on` key is text on that fill. The plain key is also safe as
  // text on `surface`.
  // ---------------------------------------------------------------------------
  success: "#5C6B53",
  onSuccess: "#FFFFFF",
  warning: "#A37C4B",
  onWarning: "#FFFFFF",
  error: "#9E4F4F",
  onError: "#FFFFFF",
  info: "#6B7A8B",
  onInfo: "#FFFFFF",

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------
  border: "#DDD6C9",
  borderStrong: "#B8AD9C",
  divider: "#E6DFD3",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  // RN 0.86 re-reads the device scheme only for the literal "unspecified";
  // null would pin useColorScheme() to null and the app to light.
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


```

---

## `frontend/src/types/patient.ts`

```ts
export const BODY_REGIONS = [
  "Knee",
  "Hip",
  "Hand",
  "Neck",
  "Lower Back",
  "Multiple",
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export type Patient = {
  patientId: string;
  name: string;
  age: number;
  sex: string;
  height: number;
  weight: number;
  bodyRegion: BodyRegion;
  createdAt: string;
};```

---

## `frontend/src/types/questionnaire.ts`

```ts
// Questionnaire domain types.
// Answers are stored as structured data. The questionnaire NEVER computes an OA
// score. Future ML integration decides how to use these features.

export type QuestionType = "single" | "multi" | "scale";

export type QuestionOption = {
  value: string;
  label: string;
};

export type Question = {
  id: string;
  section: string;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  // Conditional visibility. If omitted, the question is always visible.
  showIf?: (answers: AnswerMap) => boolean;
};

// A single-choice answer is a string, multi-choice is an array of strings,
// and a scale answer is a number.
export type AnswerValue = string | string[] | number;

export type AnswerMap = Record<string, AnswerValue>;

export type QuestionnaireDraft = {
  patientId: string;
  answers: AnswerMap;
  updatedAt: string;
  completedAt?: string;
};
```

---

## `frontend/src/types/assessment.ts`

```ts
import type { AnswerMap } from "@/src/types/questionnaire";

// Assessment domain types.
//
// One Assessment is one screening session for one patient. It snapshots the
// questionnaire answers and stores the final calculated camera features and
// quality. Every camera value is `null` until a real on-device pose provider
// measures it. Nothing here is a diagnosis or a probability.

export const FEATURE_SCHEMA_VERSION = 2;

export const MOVEMENT_TESTS = ["sit_to_stand", "gait_walk", "knee_flexion", "squat"] as const;
export type MovementTest = (typeof MOVEMENT_TESTS)[number];

export type CameraPermissionState = "granted" | "denied" | "undetermined";

export type PoseProvider = "none" | "mediapipe_webview";

export type CameraFeatures = {
  provider: PoseProvider;
  // Knee flexion angle (0° = straight leg). ROM = max − min over the session.
  kneeRomDeg: number | null;
  leftKneeRomDeg: number | null;
  rightKneeRomDeg: number | null;
  // 95th percentile of |dθ/dt| of the knee flexion angle.
  peakAngularVelocityDegS: number | null;
  // Gait-only features.
  cadenceStepsPerMin: number | null;
  stepSymmetry: number | null; // 0–100 %, ratio of mean left/right step time
  stepTimeS: number | null;
  // Non-gait: number of completed flexion/extension cycles.
  repetitions: number | null;
  frameCount: number | null;
};

export type QualityState = "NOT_AVAILABLE" | "INSUFFICIENT" | "VALID";

export type AssessmentQuality = {
  state: QualityState;
  poseVisibility: number | null; // 0–1 mean visibility of hips, knees, ankles
  note: string;
};

export type AssessmentStatus = "COMPLETED_NO_CAMERA_METRICS" | "COMPLETED";

export type Assessment = {
  assessmentId: string;
  featureSchemaVersion: number;
  patientId: string;
  patientName: string;
  bodyRegion: string;
  movementTest: MovementTest;
  createdAt: string;
  status: AssessmentStatus;
  cameraPermission: CameraPermissionState;
  // Real wall-clock duration of the camera session, in seconds. 0 if the
  // camera step was skipped.
  sessionDurationS: number;
  questionnaire: {
    answers: AnswerMap;
    answeredCount: number;
    completedAt?: string;
  };
  cameraFeatures: CameraFeatures;
  quality: AssessmentQuality;
};

// Frame-level raw data. Stored separately from the assessment record.
export type FrameSample = {
  t: number; // seconds since session start
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
  visibility: number;
  ankleGap: number; // |left ankle x − right ankle x| in normalized image units
  hipX: number; // mid-hip x in normalized image units
  leftAnkleX: number;
  rightAnkleX: number;
};

export const EMPTY_CAMERA_FEATURES: CameraFeatures = {
  provider: "none",
  kneeRomDeg: null,
  leftKneeRomDeg: null,
  rightKneeRomDeg: null,
  peakAngularVelocityDegS: null,
  cadenceStepsPerMin: null,
  stepSymmetry: null,
  stepTimeS: null,
  repetitions: null,
  frameCount: null,
};
```

---

## `frontend/src/questionnaire/questions.ts`

```ts
import type { AnswerMap, Question } from "@/src/types/questionnaire";

// Full questionnaire definition for OA Risk Detector.
// Base questions (Q1..Q14) always show. Conditional follow-ups only show when
// the triggering answer is "yes".
//
// This module is data only. It never produces a diagnosis or score.

export const QUESTIONS: Question[] = [
  // ---------------------------------------------------------------------------
  // Section 1 — Current symptoms
  // ---------------------------------------------------------------------------
  {
    id: "q1",
    section: "Current symptoms",
    prompt: "Do you currently experience pain in the joint being assessed?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
      { value: "almost_daily", label: "Almost daily" },
    ],
  },
  {
    id: "q2",
    section: "Current symptoms",
    prompt: "How often does the pain occur?",
    type: "single",
    options: [
      { value: "rarely", label: "Rarely" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "daily", label: "Every day" },
    ],
  },
  {
    id: "q3",
    section: "Current symptoms",
    prompt: "How severe is your pain right now?",
    helper: "0 means no pain. 10 means the worst pain imaginable.",
    type: "scale",
    min: 0,
    max: 10,
    minLabel: "No pain",
    maxLabel: "Worst",
  },
  {
    id: "q4",
    section: "Current symptoms",
    prompt: "Does the pain increase during movement or physical activity?",
    type: "single",
    options: [
      { value: "never", label: "Never" },
      { value: "sometimes", label: "Sometimes" },
      { value: "often", label: "Often" },
      { value: "almost_always", label: "Almost always" },
    ],
  },
  {
    id: "q5",
    section: "Current symptoms",
    prompt: "Does the pain interfere with your daily activities?",
    type: "single",
    options: [
      { value: "not_at_all", label: "Not at all" },
      { value: "slightly", label: "Slightly" },
      { value: "moderately", label: "Moderately" },
      { value: "a_lot", label: "A lot" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 2 — Stiffness and movement
  // ---------------------------------------------------------------------------
  {
    id: "q6",
    section: "Stiffness & movement",
    prompt: "Do you experience stiffness in the joint being assessed?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q7",
    section: "Stiffness & movement",
    prompt: "Do you notice stiffness after waking up or after sitting or resting for a long time?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q8",
    section: "Stiffness & movement",
    prompt: "Do you find it difficult to move the joint through its usual range?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q9",
    section: "Stiffness & movement",
    prompt: "Does the joint ever feel unstable or like it may give way?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes" },
      { value: "frequently", label: "Frequently" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 3 — Previous injury (Q10 is the gate for Q10a/Q10b)
  // ---------------------------------------------------------------------------
  {
    id: "q10",
    section: "Previous injury",
    prompt: "Have you previously injured the joint being assessed?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "q10a",
    section: "Previous injury",
    prompt: "What type of injury was it?",
    type: "single",
    options: [
      { value: "sports", label: "Sports injury" },
      { value: "fall_accident", label: "Fall or accident" },
      { value: "fracture", label: "Fracture" },
      { value: "ligament", label: "Ligament injury" },
      { value: "surgery", label: "Surgery" },
      { value: "other", label: "Other" },
    ],
    showIf: (answers) => answers.q10 === "yes",
  },
  {
    id: "q10b",
    section: "Previous injury",
    prompt: "Approximately when did the injury occur?",
    type: "single",
    options: [
      { value: "lt_1y", label: "Less than 1 year ago" },
      { value: "1_5y", label: "1 to 5 years ago" },
      { value: "gt_5y", label: "More than 5 years ago" },
      { value: "dont_remember", label: "Don't remember" },
    ],
    showIf: (answers) => answers.q10 === "yes",
  },

  // ---------------------------------------------------------------------------
  // Section 4 — Family history
  // ---------------------------------------------------------------------------
  {
    id: "q11",
    section: "Family history",
    prompt: "Has a close family member been diagnosed with osteoarthritis?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "dont_know", label: "Don't know" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 5 — Daily activity
  // ---------------------------------------------------------------------------
  {
    id: "q12",
    section: "Daily activity",
    prompt: "Does your daily work or activity involve repetitive joint loading or movement?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "occasionally", label: "Occasionally" },
      { value: "frequently", label: "Frequently" },
    ],
  },
  {
    id: "q13",
    section: "Daily activity",
    prompt: "Which of these activities do you regularly perform?",
    helper: "Select all that apply.",
    type: "multi",
    options: [
      { value: "squatting", label: "Squatting" },
      { value: "kneeling", label: "Kneeling" },
      { value: "stairs", label: "Climbing stairs" },
      { value: "heavy_lifting", label: "Heavy lifting" },
      { value: "repetitive_hand", label: "Repetitive hand movements" },
      { value: "long_standing", label: "Long periods of standing" },
      { value: "other", label: "Other" },
      { value: "none", label: "None of these" },
    ],
  },

  // ---------------------------------------------------------------------------
  // Section 6 — Other joint conditions
  // ---------------------------------------------------------------------------
  {
    id: "q14",
    section: "Other joint conditions",
    prompt: "Have you previously been diagnosed with another joint condition?",
    type: "single",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes" },
      { value: "dont_know", label: "Don't know" },
    ],
  },
  {
    id: "q14a",
    section: "Other joint conditions",
    prompt: "Which condition were you diagnosed with?",
    type: "single",
    options: [
      { value: "prev_arthritis", label: "Previous arthritis" },
      { value: "gout", label: "Gout" },
      { value: "prev_joint_disease", label: "Previous joint disease" },
      { value: "other", label: "Other" },
      { value: "dont_know", label: "Don't know" },
    ],
    showIf: (answers) => answers.q14 === "yes",
  },
];

export function getVisibleQuestions(answers: AnswerMap): Question[] {
  return QUESTIONS.filter((q) => (q.showIf ? q.showIf(answers) : true));
}

export function findQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
```

---

## `frontend/src/assessment/movementTests.ts`

```ts
import type { MovementTest } from "@/src/types/assessment";

// Movement tests offered in the camera step. Instruction copy is positioning
// guidance only; it never interprets results.

export type MovementTestInfo = {
  id: MovementTest;
  label: string;
  short: string;
  steps: string[];
};

export const MOVEMENT_TEST_INFO: Record<MovementTest, MovementTestInfo> = {
  sit_to_stand: {
    id: "sit_to_stand",
    label: "Sit-to-stand",
    short: "Rise from a chair and sit back down",
    steps: [
      "Sit on a firm chair with feet flat on the floor.",
      "Stand up fully, then sit back down at a comfortable pace.",
      "Repeat for the duration of the assessment.",
    ],
  },
  gait_walk: {
    id: "gait_walk",
    label: "Walking",
    short: "Walk across the frame at your usual pace",
    steps: [
      "Start at one side of the camera view.",
      "Walk across the frame at your normal walking speed.",
      "Turn and walk back. Keep the whole body visible.",
    ],
  },
  knee_flexion: {
    id: "knee_flexion",
    label: "Knee flexion",
    short: "Bend and straighten the knee while standing",
    steps: [
      "Stand sideways to the camera, holding support if needed.",
      "Slowly bend the knee as far as is comfortable.",
      "Straighten the leg and repeat.",
    ],
  },
  squat: {
    id: "squat",
    label: "Squat",
    short: "Lower into a comfortable squat and return",
    steps: [
      "Stand facing the camera with feet shoulder-width apart.",
      "Lower into a squat only as far as is comfortable.",
      "Return to standing and repeat.",
    ],
  },
};

export const FRAMING_TIPS: { title: string; detail: string }[] = [
  { title: "Distance", detail: "Place the phone about 2–3 metres away so the whole body fits in view." },
  { title: "Height", detail: "Rest the phone at roughly hip height on a stable surface." },
  { title: "Lighting", detail: "Use an evenly lit room. Avoid strong light behind the person." },
  { title: "Clothing", detail: "Fitted clothing helps the joints stay visible." },
  { title: "Space", detail: "Clear the area so movement is not blocked." },
];
```

---

## `frontend/src/assessment/metrics.ts`

```ts
import type { Assessment, CameraFeatures, MovementTest } from "@/src/types/assessment";

// Metric slots shown in the camera step, summary and baseline. Labels and
// units only — no normal ranges, no interpretation.

export type MetricKey = keyof Omit<CameraFeatures, "provider" | "frameCount"> | "poseVisibility";

export type MetricSlot = { key: MetricKey; label: string; unit: string; tests?: MovementTest[] };

const GAIT: MovementTest[] = ["gait_walk"];
const NON_GAIT: MovementTest[] = ["sit_to_stand", "knee_flexion", "squat"];

export const METRIC_SLOTS: MetricSlot[] = [
  { key: "kneeRomDeg", label: "Knee ROM", unit: "°" },
  { key: "leftKneeRomDeg", label: "Left knee ROM", unit: "°" },
  { key: "rightKneeRomDeg", label: "Right knee ROM", unit: "°" },
  { key: "peakAngularVelocityDegS", label: "Peak angular velocity", unit: "°/s" },
  { key: "repetitions", label: "Repetitions", unit: "cycles", tests: NON_GAIT },
  { key: "cadenceStepsPerMin", label: "Cadence", unit: "steps/min", tests: GAIT },
  { key: "stepTimeS", label: "Step time", unit: "s", tests: GAIT },
  { key: "stepSymmetry", label: "Step symmetry", unit: "%", tests: GAIT },
  { key: "poseVisibility", label: "Pose visibility", unit: "%" },
];

export function slotsForTest(test: MovementTest): MetricSlot[] {
  return METRIC_SLOTS.filter((s) => !s.tests || s.tests.includes(test));
}

export function metricValue(assessment: Pick<Assessment, "cameraFeatures" | "quality">, key: MetricKey): number | null {
  if (key === "poseVisibility") {
    const v = assessment.quality.poseVisibility;
    return v === null ? null : Math.round(v * 100);
  }
  return assessment.cameraFeatures[key];
}

export function formatMetric(value: number | null, unit: string): string {
  if (value === null || Number.isNaN(value)) return "--";
  if (unit === "°" || unit === "°/s") return `${Math.round(value)}`;
  if (unit === "s") return value.toFixed(2);
  return `${Math.round(value * 10) / 10}`;
}
```

---

## `frontend/src/assessment/format.ts`

```ts
import type { QualityState } from "@/src/types/assessment";

export function qualityLabel(state: QualityState) {
  if (state === "VALID") return "Valid";
  if (state === "INSUFFICIENT") return "Insufficient";
  return "Not available";
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
```

---

## `frontend/src/assessment/baseline.ts`

```ts
import type { Assessment } from "@/src/types/assessment";
import { getAssessmentsForPatient } from "@/src/utils/storage/assessmentStorage";

// Personal baseline: the same patient's earlier VALID assessments of the same
// movement test. Values are shown side by side; no arithmetic comparison and
// no population norms.

export type Baseline = {
  previous: Assessment[]; // newest first, excluding the current record
};

export async function getBaseline(current: Assessment): Promise<Baseline> {
  const all = await getAssessmentsForPatient(current.patientId);
  const previous = all
    .filter((a) => a.assessmentId !== current.assessmentId)
    .filter((a) => a.movementTest === current.movementTest)
    .filter((a) => a.quality.state === "VALID")
    .filter((a) => a.createdAt < current.createdAt)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { previous };
}
```

---

## `frontend/src/pose/types.ts`

```ts
export type PoseFacing = "user" | "environment";

export type PoseCameraProps = {
  facing: PoseFacing;
  onMessage: (raw: string) => void;
};

export type PosePoint = [x: number, y: number, visibility: number];
export type WorldPoint = [x: number, y: number, z: number];

export type PoseMessage =
  | { type: "status"; stage: "loading" | "camera" | "ready" }
  | { type: "error"; message: string }
  | { type: "pose"; t: number; img: Record<string, PosePoint>; world: Record<string, WorldPoint> }
  | { type: "nopose"; t: number };

export function parsePoseMessage(raw: string): PoseMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === "string") return parsed as PoseMessage;
  } catch {
    // Non-JSON messages (e.g. devtools noise) are ignored.
  }
  return null;
}
```

---

## `frontend/src/pose/poseHtml.ts`

```ts
// Self-contained page that runs MediaPipe Pose Landmarker (Tasks Vision, WASM)
// on the live camera stream and posts lower-body landmarks to the host.
//
// Host contract (JSON messages):
//   { type: "status", stage: "loading" | "camera" | "ready" }
//   { type: "error", message: string }
//   { type: "pose", t: number, img: Record<idx, [x, y, visibility]>, world: Record<idx, [x, y, z]> }
//   { type: "nopose", t: number }
// Host → page: window.__setFacing("user" | "environment")
//
// Indices: 11/12 shoulders, 23/24 hips, 25/26 knees, 27/28 ankles, 29/30 heels,
// 31/32 foot index (left = odd, right = even).

export const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const TASKS_VISION_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
const TASKS_VISION_URL = `${TASKS_VISION_BASE}/vision_bundle.mjs`;

export const POSE_INDICES = [11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export function buildPoseHtml(facing: "user" | "environment") {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: #1C1B1A; overflow: hidden; }
  #wrap { position: relative; width: 100%; height: 100%; }
  video, canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
  video.mirror, canvas.mirror { transform: scaleX(-1); }
</style>
</head>
<body>
<div id="wrap">
  <video id="v" autoplay playsinline muted></video>
  <canvas id="c"></canvas>
</div>
<script type="module">
  const INDICES = ${JSON.stringify(POSE_INDICES)};
  const CONNECTIONS = [[11,12],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[27,31],[24,26],[26,28],[28,30],[28,32]];
  let facing = ${JSON.stringify(facing)};
  const video = document.getElementById("v");
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let landmarker = null;
  let stream = null;
  let lastVideoTime = -1;
  let running = false;

  const send = (m) => {
    const s = JSON.stringify(m);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(s);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(s, "*");
    }
  };
  const fail = (message) => send({ type: "error", message: String(message) });

  const applyMirror = () => {
    const mirror = facing === "user";
    video.classList.toggle("mirror", mirror);
    canvas.classList.toggle("mirror", mirror);
  };

  async function startCamera() {
    send({ type: "status", stage: "camera" });
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Camera API is not available in this view.");
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    video.srcObject = stream;
    await new Promise((resolve) => { video.onloadedmetadata = () => resolve(); });
    await video.play();
    applyMirror();
  }

  async function loadModel() {
    send({ type: "status", stage: "loading" });
    const vision = await import(${JSON.stringify(TASKS_VISION_URL)});
    const { PoseLandmarker, FilesetResolver } = vision;
    const fileset = await FilesetResolver.forVisionTasks(${JSON.stringify(TASKS_VISION_BASE + "/wasm")});
    const options = {
      baseOptions: { modelAssetPath: ${JSON.stringify(POSE_MODEL_URL)}, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    try {
      landmarker = await PoseLandmarker.createFromOptions(fileset, options);
    } catch (e) {
      options.baseOptions.delegate = "CPU";
      landmarker = await PoseLandmarker.createFromOptions(fileset, options);
    }
  }

  function draw(lm) {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!lm) return;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(214, 206, 194, 0.95)";
    for (const [a, b] of CONNECTIONS) {
      const p = lm[a], q = lm[b];
      if (!p || !q || (p.visibility ?? 1) < 0.3 || (q.visibility ?? 1) < 0.3) continue;
      ctx.beginPath(); ctx.moveTo(p.x * w, p.y * h); ctx.lineTo(q.x * w, q.y * h); ctx.stroke();
    }
    ctx.fillStyle = "rgba(163, 124, 75, 0.95)";
    for (const i of INDICES) {
      const p = lm[i];
      if (!p || (p.visibility ?? 1) < 0.3) continue;
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function fitCanvas() {
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    if (canvas.width !== vw || canvas.height !== vh) { canvas.width = vw; canvas.height = vh; }
  }

  function loop() {
    if (!running) return;
    if (landmarker && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      fitCanvas();
      const now = performance.now();
      let result = null;
      try { result = landmarker.detectForVideo(video, now); } catch (e) { fail("Pose detection failed: " + e); running = false; return; }
      const lm = result && result.landmarks && result.landmarks[0];
      const wl = result && result.worldLandmarks && result.worldLandmarks[0];
      draw(lm);
      if (lm) {
        const img = {}, world = {};
        for (const i of INDICES) {
          const p = lm[i]; const q = wl ? wl[i] : null;
          img[i] = [+p.x.toFixed(4), +p.y.toFixed(4), +((p.visibility ?? 0)).toFixed(3)];
          if (q) world[i] = [+q.x.toFixed(4), +q.y.toFixed(4), +q.z.toFixed(4)];
        }
        send({ type: "pose", t: now, img, world });
      } else {
        send({ type: "nopose", t: now });
      }
    }
    requestAnimationFrame(loop);
  }

  window.__setFacing = async (next) => {
    facing = next;
    try { await startCamera(); } catch (e) { fail("Could not switch camera: " + e); }
  };

  (async () => {
    try {
      await startCamera();
      await loadModel();
      send({ type: "status", stage: "ready" });
      running = true;
      requestAnimationFrame(loop);
    } catch (e) {
      fail(e && e.message ? e.message : e);
    }
  })();
</script>
</body>
</html>`;
}
```

---

## `frontend/src/pose/PoseCamera.tsx`

```tsx
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
```

---

## `frontend/src/pose/PoseCamera.web.tsx`

```tsx
import { createElement, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { buildPoseHtml } from "@/src/pose/poseHtml";
import type { PoseCameraProps } from "@/src/pose/types";

// Web preview implementation: react-native-webview has no web target, so the
// same MediaPipe page is embedded in an iframe and talks back via postMessage.
export function PoseCamera({ facing, onMessage }: PoseCameraProps) {
  const html = useMemo(() => buildPoseHtml(facing), [facing]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.data === "string" && event.data.startsWith("{")) onMessage(event.data);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onMessage]);

  return (
    <View style={styles.fill}>
      {createElement("iframe", {
        srcDoc: html,
        allow: "camera; microphone",
        style: { border: "none", width: "100%", height: "100%", background: "transparent" },
        title: "Pose camera",
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
```

---

## `frontend/src/pose/movementTracker.ts`

```ts
// Movement tracker: turns per-frame pose landmarks into live and final
// movement features. Pure TypeScript, no React, no platform APIs.
//
// Measurement only. Nothing here interprets values clinically; there are no
// medical normal ranges. The only thresholds are measurement-quality checks
// (enough frames, enough visibility) and signal-processing parameters.

import type { AssessmentQuality, CameraFeatures, FrameSample, MovementTest } from "../types/assessment";
import type { PoseMessage, PosePoint, WorldPoint } from "./types";

const L = { hip: 23, knee: 25, ankle: 27 } as const;
const R = { hip: 24, knee: 26, ankle: 28 } as const;
const VISIBILITY_INDICES = [23, 24, 25, 26, 27, 28];

// Signal / quality parameters (not clinical thresholds).
const ANGLE_SMOOTHING = 0.4; // EMA factor for knee angle
const GAP_SMOOTHING = 0.5; // EMA factor for inter-ankle distance
const SIDE_MIN_VISIBILITY = 0.5; // below this a side's knee angle is not trusted
const MIN_FRAMES_VALID = 30;
const MIN_DURATION_VALID_S = 3;
const MIN_MEAN_VISIBILITY_VALID = 0.5;
const MIN_STEP_SEPARATION_S = 0.25;
const MIN_REP_RANGE_DEG = 15;

export type LiveMetrics = {
  frameCount: number;
  durationS: number;
  leftKneeDeg: number | null;
  rightKneeDeg: number | null;
  kneeRomDeg: number | null;
  repetitions: number | null;
  steps: number | null;
  cadenceStepsPerMin: number | null;
  visibility: number | null;
};

export type FinalResult = {
  features: CameraFeatures;
  quality: AssessmentQuality;
  frames: FrameSample[];
};

type Vec3 = [number, number, number];

export class MovementTracker {
  private frames: FrameSample[] = [];
  private startT: number | null = null;
  private lastT: number | null = null;
  private emaLeft: number | null = null;
  private emaRight: number | null = null;
  private emaGap: number | null = null;
  private noPoseFrames = 0;
  private readonly test: MovementTest;

  constructor(test: MovementTest) {
    this.test = test;
  }

  reset() {
    this.frames = [];
    this.startT = null;
    this.lastT = null;
    this.emaLeft = null;
    this.emaRight = null;
    this.emaGap = null;
    this.noPoseFrames = 0;
  }

  get frameCount() {
    return this.frames.length;
  }

  get durationS() {
    if (this.startT === null || this.lastT === null) return 0;
    return (this.lastT - this.startT) / 1000;
  }

  handle(message: PoseMessage) {
    if (message.type === "nopose") {
      this.noPoseFrames += 1;
      return;
    }
    if (message.type !== "pose") return;
    this.addPose(message.t, message.img, message.world);
  }

  addPose(tMs: number, img: Record<string, PosePoint>, world: Record<string, WorldPoint>) {
    if (this.startT === null) this.startT = tMs;
    this.lastT = tMs;

    const left = kneeFlexion(img, world, L);
    const right = kneeFlexion(img, world, R);
    this.emaLeft = ema(this.emaLeft, left, ANGLE_SMOOTHING);
    this.emaRight = ema(this.emaRight, right, ANGLE_SMOOTHING);

    const la = img[L.ankle];
    const ra = img[R.ankle];
    const lh = img[L.hip];
    const rh = img[R.hip];
    const gap = la && ra ? Math.abs(la[0] - ra[0]) : 0;
    this.emaGap = ema(this.emaGap, gap, GAP_SMOOTHING);

    const visibility = mean(VISIBILITY_INDICES.map((i) => img[i]?.[2] ?? 0));

    this.frames.push({
      t: round((tMs - this.startT) / 1000, 3),
      leftKneeDeg: this.emaLeft === null ? null : round(this.emaLeft, 1),
      rightKneeDeg: this.emaRight === null ? null : round(this.emaRight, 1),
      visibility: round(visibility, 3),
      ankleGap: round(this.emaGap ?? gap, 4),
      hipX: lh && rh ? round((lh[0] + rh[0]) / 2, 4) : 0.5,
      leftAnkleX: la ? la[0] : 0,
      rightAnkleX: ra ? ra[0] : 0,
    });
  }

  live(): LiveMetrics {
    const last = this.frames[this.frames.length - 1];
    const primary = this.primarySeries();
    const rom = primary ? robustRange(primary.values) : null;
    const isGait = this.test === "gait_walk";
    const steps = isGait ? detectSteps(this.frames) : null;
    return {
      frameCount: this.frames.length,
      durationS: this.durationS,
      leftKneeDeg: last?.leftKneeDeg ?? null,
      rightKneeDeg: last?.rightKneeDeg ?? null,
      kneeRomDeg: rom,
      repetitions: !isGait && primary ? countCycles(primary.values) : null,
      steps: steps ? steps.length : null,
      cadenceStepsPerMin: steps ? cadenceFromSteps(steps) : null,
      visibility: last ? mean(this.frames.slice(-15).map((f) => f.visibility)) : null,
    };
  }

  finalize(sessionDurationS: number): FinalResult {
    const frames = this.frames;
    const meanVis = frames.length ? mean(frames.map((f) => f.visibility)) : null;
    const leftSeries = series(frames, "leftKneeDeg");
    const rightSeries = series(frames, "rightKneeDeg");
    const primary = this.primarySeries();
    const isGait = this.test === "gait_walk";
    const steps = isGait ? detectSteps(frames) : null;

    const features: CameraFeatures = {
      provider: "mediapipe_webview",
      kneeRomDeg: primary ? robustRange(primary.values) : null,
      leftKneeRomDeg: robustRange(leftSeries.values),
      rightKneeRomDeg: robustRange(rightSeries.values),
      peakAngularVelocityDegS: peakAngularVelocity(leftSeries, rightSeries),
      cadenceStepsPerMin: steps ? cadenceFromSteps(steps) : null,
      stepSymmetry: steps ? stepSymmetry(frames, steps) : null,
      stepTimeS: steps ? meanStepTime(steps) : null,
      repetitions: !isGait && primary ? countCycles(primary.values) : null,
      frameCount: frames.length,
    };

    let quality: AssessmentQuality;
    if (frames.length === 0) {
      quality = {
        state: "INSUFFICIENT",
        poseVisibility: null,
        note: this.noPoseFrames > 0 ? "The camera ran but no person was detected in frame." : "No pose frames were received from the camera.",
      };
    } else if (frames.length < MIN_FRAMES_VALID || sessionDurationS < MIN_DURATION_VALID_S) {
      quality = { state: "INSUFFICIENT", poseVisibility: meanVis, note: "The session was too short to measure movement reliably." };
    } else if ((meanVis ?? 0) < MIN_MEAN_VISIBILITY_VALID) {
      quality = { state: "INSUFFICIENT", poseVisibility: meanVis, note: "Hips, knees or ankles were not visible enough during the session." };
    } else {
      quality = { state: "VALID", poseVisibility: meanVis, note: "Movement features were measured from the live pose stream on this device." };
    }

    return { features, quality, frames };
  }

  // The side with more trusted samples is used for the headline ROM and reps.
  private primarySeries() {
    const left = series(this.frames, "leftKneeDeg");
    const right = series(this.frames, "rightKneeDeg");
    if (left.values.length === 0 && right.values.length === 0) return null;
    return left.values.length >= right.values.length ? left : right;
  }
}

// -----------------------------------------------------------------------------
// Geometry
// -----------------------------------------------------------------------------

function kneeFlexion(
  img: Record<string, PosePoint>,
  world: Record<string, WorldPoint>,
  side: { hip: number; knee: number; ankle: number },
): number | null {
  const vis = Math.min(img[side.hip]?.[2] ?? 0, img[side.knee]?.[2] ?? 0, img[side.ankle]?.[2] ?? 0);
  if (vis < SIDE_MIN_VISIBILITY) return null;
  const pick = (i: number): Vec3 | null => {
    const w = world[i];
    if (w) return [w[0], w[1], w[2]];
    const p = img[i];
    return p ? [p[0], p[1], 0] : null;
  };
  const hip = pick(side.hip);
  const knee = pick(side.knee);
  const ankle = pick(side.ankle);
  if (!hip || !knee || !ankle) return null;
  const inner = angleAt(hip, knee, ankle);
  return inner === null ? null : 180 - inner;
}

export function angleAt(a: Vec3, b: Vec3, c: Vec3): number | null {
  const ab: Vec3 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cb: Vec3 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
  const na = Math.hypot(...ab);
  const nc = Math.hypot(...cb);
  if (na === 0 || nc === 0) return null;
  const cos = clamp((ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2]) / (na * nc), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

// -----------------------------------------------------------------------------
// Series helpers
// -----------------------------------------------------------------------------

type Series = { t: number[]; values: number[] };

function series(frames: FrameSample[], key: "leftKneeDeg" | "rightKneeDeg"): Series {
  const t: number[] = [];
  const values: number[] = [];
  for (const f of frames) {
    const v = f[key];
    if (v !== null) {
      t.push(f.t);
      values.push(v);
    }
  }
  return { t, values };
}

export function robustRange(values: number[]): number | null {
  if (values.length < 5) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return round(percentile(sorted, 0.98) - percentile(sorted, 0.02), 1);
}

function peakAngularVelocity(...all: Series[]): number | null {
  const speeds: number[] = [];
  for (const s of all) {
    for (let i = 1; i < s.values.length; i++) {
      const dt = s.t[i] - s.t[i - 1];
      if (dt <= 0 || dt > 0.2) continue;
      speeds.push(Math.abs((s.values[i] - s.values[i - 1]) / dt));
    }
  }
  if (speeds.length < 5) return null;
  speeds.sort((a, b) => a - b);
  return round(percentile(speeds, 0.95), 1);
}

// Count full flexion→extension cycles with hysteresis around the mid-range.
export function countCycles(values: number[]): number {
  if (values.length < 5) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range < MIN_REP_RANGE_DEG) return 0;
  const high = min + range * 0.65;
  const low = min + range * 0.35;
  let above = false;
  let count = 0;
  for (const v of values) {
    if (!above && v > high) above = true;
    else if (above && v < low) {
      above = false;
      count += 1;
    }
  }
  return count;
}

// Step events = local maxima of the (smoothed) inter-ankle distance.
export type StepEvent = { index: number; t: number };

export function detectSteps(frames: FrameSample[]): StepEvent[] {
  if (frames.length < 10) return [];
  const gap = frames.map((f) => f.ankleGap);
  const min = Math.min(...gap);
  const max = Math.max(...gap);
  const range = max - min;
  if (range < 0.02) return [];
  const floor = min + range * 0.4;
  const peaks: number[] = [];
  for (let i = 1; i < gap.length - 1; i++) {
    if (gap[i] >= gap[i - 1] && gap[i] > gap[i + 1] && gap[i] > floor) {
      const last = peaks[peaks.length - 1];
      if (last !== undefined && frames[i].t - frames[last].t < MIN_STEP_SEPARATION_S) {
        if (gap[i] > gap[last]) peaks[peaks.length - 1] = i;
      } else {
        peaks.push(i);
      }
    }
  }
  return peaks.map((index) => ({ index, t: frames[index].t }));
}

function cadenceFromSteps(steps: StepEvent[]): number | null {
  if (steps.length < 2) return null;
  const span = steps[steps.length - 1].t - steps[0].t;
  if (span <= 0) return null;
  return round(((steps.length - 1) / span) * 60, 1);
}

function meanStepTime(steps: StepEvent[]): number | null {
  if (steps.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < steps.length; i++) intervals.push(steps[i].t - steps[i - 1].t);
  return round(mean(intervals), 3);
}

// Ratio (%) of mean left vs right step time. Each step interval is labelled by
// the foot leading at its end peak; for frontal walking (no lateral hip
// travel) labels alternate.
function stepSymmetry(frames: FrameSample[], steps: StepEvent[]): number | null {
  if (steps.length < 5) return null;
  const left: number[] = [];
  const right: number[] = [];
  let lastLabel: "L" | "R" | null = null;
  for (let i = 1; i < steps.length; i++) {
    const cur = frames[steps[i].index];
    const prev = frames[steps[i - 1].index];
    const dir = cur.hipX - prev.hipX;
    let label: "L" | "R";
    if (Math.abs(dir) > 0.01) {
      const leftAhead = (cur.leftAnkleX - cur.rightAnkleX) * Math.sign(dir) > 0;
      label = leftAhead ? "L" : "R";
    } else {
      label = lastLabel === "L" ? "R" : "L";
    }
    lastLabel = label;
    (label === "L" ? left : right).push(steps[i].t - steps[i - 1].t);
  }
  if (left.length < 2 || right.length < 2) return null;
  const a = mean(left);
  const b = mean(right);
  if (a <= 0 || b <= 0) return null;
  return round((Math.min(a, b) / Math.max(a, b)) * 100, 1);
}

// -----------------------------------------------------------------------------
// Math
// -----------------------------------------------------------------------------

function ema(prev: number | null, next: number | null, alpha: number): number | null {
  if (next === null) return prev;
  if (prev === null) return next;
  return prev + alpha * (next - prev);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = clamp(Math.round((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[idx];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function round(v: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
```

---

## `frontend/src/db/types.ts`

```ts
import type { Assessment, FrameSample } from "@/src/types/assessment";
import type { Patient } from "@/src/types/patient";
import type { QuestionnaireDraft } from "@/src/types/questionnaire";

// Local database contract. Native uses expo-sqlite (db/index.ts); the web
// preview uses AsyncStorage (db/index.web.ts). Both are on-device only.
export interface LocalDb {
  getPatients(): Promise<Patient[]>;
  savePatient(patient: Patient): Promise<boolean>;

  getDraft(patientId: string): Promise<QuestionnaireDraft | null>;
  saveDraft(draft: QuestionnaireDraft): Promise<boolean>;
  clearDraft(patientId: string): Promise<boolean>;

  getAssessments(): Promise<Assessment[]>;
  getAssessment(assessmentId: string): Promise<Assessment | null>;
  saveAssessment(assessment: Assessment): Promise<boolean>;

  saveFrameSeries(assessmentId: string, frames: FrameSample[]): Promise<boolean>;
  getFrameSeriesCount(assessmentId: string): Promise<number>;

  engine: "sqlite" | "async-storage";
}
```

---

## `frontend/src/db/index.ts`

```ts
import * as SQLite from "expo-sqlite";

import type { LocalDb } from "@/src/db/types";
import type { Assessment, FrameSample } from "@/src/types/assessment";
import type { Patient } from "@/src/types/patient";
import type { QuestionnaireDraft } from "@/src/types/questionnaire";
import { storage } from "@/src/utils/storage";

// Native on-device database (expo-sqlite). Relational core columns plus JSON
// payload columns for nested structures. Frame-level raw data lives in its own
// table, separate from the final assessment features.

const DB_NAME = "oa_risk_detector.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

async function open() {
  const handle = await SQLite.openDatabaseAsync(DB_NAME);
  await handle.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS patients (
      patient_id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      body_region TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questionnaire_drafts (
      patient_id TEXT PRIMARY KEY NOT NULL,
      answers_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS assessments (
      assessment_id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      body_region TEXT NOT NULL,
      movement_test TEXT NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      quality_state TEXT NOT NULL,
      feature_schema_version INTEGER NOT NULL,
      record_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patient_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS frame_series (
      assessment_id TEXT NOT NULL,
      frame_index INTEGER NOT NULL,
      t REAL NOT NULL,
      left_knee_deg REAL,
      right_knee_deg REAL,
      visibility REAL NOT NULL,
      ankle_gap REAL NOT NULL,
      hip_x REAL NOT NULL,
      PRIMARY KEY (assessment_id, frame_index)
    );
  `);
  await migrateFromAsyncStorage(handle);
  return handle;
}

// One-time import of records written by the earlier AsyncStorage layer.
async function migrateFromAsyncStorage(handle: SQLite.SQLiteDatabase) {
  const patients = (await storage.getItem<Patient[]>("oa-risk-detector/patients", [])) ?? [];
  for (const p of patients) await upsertPatient(handle, p);
  if (patients.length) await storage.removeItem("oa-risk-detector/patients");

  const assessments = (await storage.getItem<Assessment[]>("oa-risk-detector/assessments", [])) ?? [];
  for (const a of assessments) await upsertAssessment(handle, a);
  if (assessments.length) await storage.removeItem("oa-risk-detector/assessments");
}

async function upsertPatient(handle: SQLite.SQLiteDatabase, p: Patient) {
  await handle.runAsync(
    `INSERT OR REPLACE INTO patients (patient_id, name, age, sex, height, weight, body_region, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    p.patientId, p.name, p.age, p.sex, p.height, p.weight, p.bodyRegion, p.createdAt,
  );
}

async function upsertAssessment(handle: SQLite.SQLiteDatabase, a: Assessment) {
  await handle.runAsync(
    `INSERT OR REPLACE INTO assessments
     (assessment_id, patient_id, patient_name, body_region, movement_test, created_at, status, quality_state, feature_schema_version, record_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    a.assessmentId, a.patientId, a.patientName, a.bodyRegion, a.movementTest, a.createdAt, a.status, a.quality.state, a.featureSchemaVersion, JSON.stringify(a),
  );
}

type PatientRow = { patient_id: string; name: string; age: number; sex: string; height: number; weight: number; body_region: string; created_at: string };
type DraftRow = { patient_id: string; answers_json: string; updated_at: string; completed_at: string | null };
type AssessmentRow = { record_json: string };

function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  return fn().catch((e) => {
    console.warn("[db]", e);
    return fallback;
  });
}

export const localDb: LocalDb = {
  engine: "sqlite",

  getPatients: () =>
    safe([], async () => {
      const rows = await (await db()).getAllAsync<PatientRow>("SELECT * FROM patients ORDER BY created_at DESC");
      return rows.map((r) => ({
        patientId: r.patient_id,
        name: r.name,
        age: r.age,
        sex: r.sex,
        height: r.height,
        weight: r.weight,
        bodyRegion: r.body_region as Patient["bodyRegion"],
        createdAt: r.created_at,
      }));
    }),

  savePatient: (patient) =>
    safe(false, async () => {
      await upsertPatient(await db(), patient);
      return true;
    }),

  getDraft: (patientId) =>
    safe(null, async () => {
      const row = await (await db()).getFirstAsync<DraftRow>("SELECT * FROM questionnaire_drafts WHERE patient_id = ?", patientId);
      if (!row) return null;
      return { patientId: row.patient_id, answers: JSON.parse(row.answers_json), updatedAt: row.updated_at, completedAt: row.completed_at ?? undefined };
    }),

  saveDraft: (draft) =>
    safe(false, async () => {
      await (await db()).runAsync(
        `INSERT OR REPLACE INTO questionnaire_drafts (patient_id, answers_json, updated_at, completed_at) VALUES (?, ?, ?, ?)`,
        draft.patientId, JSON.stringify(draft.answers), draft.updatedAt, draft.completedAt ?? null,
      );
      return true;
    }),

  clearDraft: (patientId) =>
    safe(false, async () => {
      await (await db()).runAsync("DELETE FROM questionnaire_drafts WHERE patient_id = ?", patientId);
      return true;
    }),

  getAssessments: () =>
    safe([], async () => {
      const rows = await (await db()).getAllAsync<AssessmentRow>("SELECT record_json FROM assessments ORDER BY created_at DESC");
      return rows.map((r) => JSON.parse(r.record_json) as Assessment);
    }),

  getAssessment: (assessmentId) =>
    safe(null, async () => {
      const row = await (await db()).getFirstAsync<AssessmentRow>("SELECT record_json FROM assessments WHERE assessment_id = ?", assessmentId);
      return row ? (JSON.parse(row.record_json) as Assessment) : null;
    }),

  saveAssessment: (assessment) =>
    safe(false, async () => {
      await upsertAssessment(await db(), assessment);
      return true;
    }),

  saveFrameSeries: (assessmentId, frames: FrameSample[]) =>
    safe(false, async () => {
      const handle = await db();
      await handle.withTransactionAsync(async () => {
        await handle.runAsync("DELETE FROM frame_series WHERE assessment_id = ?", assessmentId);
        const stmt = await handle.prepareAsync(
          `INSERT INTO frame_series (assessment_id, frame_index, t, left_knee_deg, right_knee_deg, visibility, ankle_gap, hip_x)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        try {
          for (let i = 0; i < frames.length; i++) {
            const f = frames[i];
            await stmt.executeAsync(assessmentId, i, f.t, f.leftKneeDeg, f.rightKneeDeg, f.visibility, f.ankleGap, f.hipX);
          }
        } finally {
          await stmt.finalizeAsync();
        }
      });
      return true;
    }),

  getFrameSeriesCount: (assessmentId) =>
    safe(0, async () => {
      const row = await (await db()).getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM frame_series WHERE assessment_id = ?", assessmentId);
      return row?.n ?? 0;
    }),
};
```

---

## `frontend/src/db/index.web.ts`

```ts
import type { LocalDb } from "@/src/db/types";
import type { Assessment, FrameSample } from "@/src/types/assessment";
import type { Patient } from "@/src/types/patient";
import type { QuestionnaireDraft } from "@/src/types/questionnaire";
import { storage } from "@/src/utils/storage";

// Web preview fallback: the same LocalDb contract on AsyncStorage. The
// production Android/iOS app uses expo-sqlite (db/index.ts).

const PATIENTS_KEY = "oa-risk-detector/patients";
const ASSESSMENTS_KEY = "oa-risk-detector/assessments";
const draftKey = (patientId: string) => `oa-risk-detector/questionnaire/${patientId}`;
const framesKey = (assessmentId: string) => `oa-risk-detector/frames/${assessmentId}`;

async function list<T>(key: string): Promise<T[]> {
  return (await storage.getItem<T[]>(key, [])) ?? [];
}

export const localDb: LocalDb = {
  engine: "async-storage",

  getPatients: () => list<Patient>(PATIENTS_KEY),
  savePatient: async (patient) => {
    const patients = await list<Patient>(PATIENTS_KEY);
    return storage.setItem(PATIENTS_KEY, [patient, ...patients.filter((p) => p.patientId !== patient.patientId)]);
  },

  getDraft: async (patientId) => (await storage.getItem<QuestionnaireDraft | null>(draftKey(patientId), null)) ?? null,
  saveDraft: (draft) => storage.setItem(draftKey(draft.patientId), draft),
  clearDraft: (patientId) => storage.removeItem(draftKey(patientId)),

  getAssessments: () => list<Assessment>(ASSESSMENTS_KEY),
  getAssessment: async (assessmentId) => (await list<Assessment>(ASSESSMENTS_KEY)).find((a) => a.assessmentId === assessmentId) ?? null,
  saveAssessment: async (assessment) => {
    const all = await list<Assessment>(ASSESSMENTS_KEY);
    return storage.setItem(ASSESSMENTS_KEY, [assessment, ...all.filter((a) => a.assessmentId !== assessment.assessmentId)]);
  },

  saveFrameSeries: (assessmentId, frames: FrameSample[]) => storage.setItem(framesKey(assessmentId), frames),
  getFrameSeriesCount: async (assessmentId) => (await list<FrameSample>(framesKey(assessmentId))).length,
};
```

---

## `frontend/src/utils/storage/index.ts`

```ts
// Native storage (Metro auto-picks index.web.ts on web — do NOT add Platform.OS checks).
//
// Import the ready-made singleton BY NAME and call methods on it — never a default
// import, never the methods bare:
//   import { storage } from "@/src/utils/storage";
//   await storage.getItem(key, fallback);      // the `fallback` arg is REQUIRED
//
// Namespaces: general KV -> getItem/setItem/removeItem (AsyncStorage);
//             tokens/secrets -> secureGet/secureSet/secureRemove (Keychain).
// Values are auto JSON-serialized (string|number|boolean|null) in this implementation — never JSON.stringify/parse yourself.
// Helpers NEVER throw: a miss returns `fallback`, a failed write returns `false` (failures are SILENT).
// 
// Use async/await for all storage operations.
//
// AUTH TOKENS: use ONE namespace (secure*) + ONE shared key constant, and read/write it the SAME
// way on both sides — the login/AuthContext (write) and the API client/interceptor (read). A
// mismatched method or key silently returns the fallback, surfacing as a logged-out state or 401/403
// with no error in the logs.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { AssertNoExtras, StorageBase, StorageItemValue } from "./storage-base";

export class Storage extends StorageBase {
  // General KV — backed by AsyncStorage.
  // `fallback` is required and returned on any miss/parse error — a missing key looks identical to a stored `null`.
  async getItem<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return this.retrieve(raw, fallback);
    } catch (e) {
      this.warn("getItem", key, e);
      return fallback;
    }
  }

  async setItem<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      this.warn("setItem", key, e);
      return false;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      this.warn("removeItem", key, e);
      return false;
    }
  }

  // Sensitive values — Keychain (iOS) / EncryptedSharedPreferences (Android).
  // Use these (not getItem) for auth tokens; whatever writes with secureSet must read with secureGet under the same key.
  async secureGet<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null> {
    try {
      const raw = await SecureStore.getItemAsync(key);
      return this.retrieve(raw, fallback);
    } catch (e) {
      this.warn("secureGet", key, e);
      return fallback;
    }
  }

  async secureSet<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
      return true;
    } catch (e) {
      this.warn("secureSet", key, e);
      return false;
    }
  }

  async secureRemove(key: string): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (e) {
      this.warn("secureRemove", key, e);
      return false;
    }
  }
}

// The shared singleton — import THIS (`import { storage } from "@/src/utils/storage"`). Do not `new Storage()`.
export const storage = new Storage();

// Compile-time guard: any new method must be declared in storage-base.ts first.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentional compile-time-only assertion
type _NoExtras = AssertNoExtras<Exclude<keyof Storage, keyof StorageBase>>;```

---

## `frontend/src/utils/storage/storage-base.ts`

```ts
// Abstract base for the storage wrapper — shared types + helpers.
// Concrete implementations live in index.ts (native) and index.web.ts (web).

export type StorageItemKey = string;
// AsyncStorage serializes JSON values, so structured offline records are valid
// alongside primitive preferences.
export type StorageItemValue = string | number | boolean | null | object;

// Helper for subclasses to enforce that they don't declare methods beyond
// StorageBase. Use as: type _ = AssertNoExtras<Exclude<keyof Storage, keyof StorageBase>>;
export type AssertNoExtras<T extends never> = T;

export abstract class StorageBase {
  protected warn(op: string, key: StorageItemKey, e: unknown) {
    console.warn(`[storage] ${op}(${key}) failed`, e);
  }

  // raw is whatever AsyncStorage / SecureStore returned: a JSON-encoded string
  // (because setItem always JSON.stringifies) or null if the key was missing.
  // We always JSON.parse so values round-trip correctly across types.
  protected retrieve<Fallback extends StorageItemValue>(
    raw: string | null,
    fallback: Fallback,
  ): Fallback | null {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as Fallback;
    } catch (e) {
      this.warn("retrieve", "parse error", e);
      return fallback;
    }
  }

  abstract getItem<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null>;
  abstract setItem<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean>;
  abstract removeItem(key: string): Promise<boolean>;
  abstract secureGet<Fallback extends StorageItemValue>(
    key: string,
    fallback: Fallback,
  ): Promise<Fallback | null>;
  abstract secureSet<Value extends StorageItemValue>(
    key: string,
    value: Value,
  ): Promise<boolean>;
  abstract secureRemove(key: string): Promise<boolean>;
}
```

---

## `frontend/src/utils/storage/patientStorage.ts`

```ts
import { localDb } from "@/src/db";
import type { Patient } from "@/src/types/patient";

export function getPatients(): Promise<Patient[]> {
  return localDb.getPatients();
}

export function savePatient(patient: Patient): Promise<boolean> {
  return localDb.savePatient(patient);
}

export async function getPatientCount(): Promise<number> {
  return (await getPatients()).length;
}
```

---

## `frontend/src/utils/storage/questionnaireStorage.ts`

```ts
import { localDb } from "@/src/db";
import type { AnswerMap, QuestionnaireDraft } from "@/src/types/questionnaire";

// Per-patient questionnaire drafts. A draft is the in-progress or completed
// answer set for a single assessment session. On this device only.

export function loadDraft(patientId: string): Promise<QuestionnaireDraft | null> {
  return localDb.getDraft(patientId);
}

export async function saveDraft(
  patientId: string,
  answers: AnswerMap,
  completed = false,
): Promise<boolean> {
  const now = new Date().toISOString();
  const existing = await loadDraft(patientId);
  return localDb.saveDraft({
    patientId,
    answers,
    updatedAt: now,
    completedAt: completed ? now : existing?.completedAt,
  });
}

export function clearDraft(patientId: string): Promise<boolean> {
  return localDb.clearDraft(patientId);
}
```

---

## `frontend/src/utils/storage/assessmentStorage.ts`

```ts
import { localDb } from "@/src/db";
import type { Assessment, FrameSample } from "@/src/types/assessment";

// Local assessment records, newest first. On this device only. The list is
// empty until a session is completed; nothing is seeded.

export function getAssessments(): Promise<Assessment[]> {
  return localDb.getAssessments();
}

export function getAssessment(assessmentId: string): Promise<Assessment | null> {
  return localDb.getAssessment(assessmentId);
}

export async function getAssessmentsForPatient(patientId: string): Promise<Assessment[]> {
  return (await getAssessments()).filter((a) => a.patientId === patientId);
}

export function saveAssessment(assessment: Assessment): Promise<boolean> {
  return localDb.saveAssessment(assessment);
}

// Frame-level raw data is stored apart from the assessment record.
export function saveFrameSeries(assessmentId: string, frames: FrameSample[]): Promise<boolean> {
  return localDb.saveFrameSeries(assessmentId, frames);
}

export function getFrameSeriesCount(assessmentId: string): Promise<number> {
  return localDb.getFrameSeriesCount(assessmentId);
}

export async function getAssessmentCount(): Promise<number> {
  return (await getAssessments()).length;
}

export const storageEngine = localDb.engine;

export function generateAssessmentId() {
  const datePart = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AS-${datePart}-${randomPart}`;
}
```

---

## `frontend/scripts/tracker-check.ts`

```ts
// Synthetic-signal check for MovementTracker. Run: node scripts/tracker-check.ts
import assert from "node:assert/strict";

import { MovementTracker, angleAt } from "../src/pose/movementTracker.ts";

const deg = (d: number) => (d * Math.PI) / 180;

// Build image + world landmarks for a leg with a given knee flexion angle.
function legFrame(flexion: number, ankleGapX: number, hipX = 0.5) {
  const img: Record<string, [number, number, number]> = {};
  const world: Record<string, [number, number, number]> = {};
  const build = (hip: number, knee: number, ankle: number, x: number, ankleX: number) => {
    // hip at origin, thigh straight down, shank rotated by flexion angle
    const thigh = 0.45;
    const shank = 0.45;
    const kneeP: [number, number, number] = [0, thigh, 0];
    const ankleP: [number, number, number] = [Math.sin(deg(flexion)) * shank, thigh + Math.cos(deg(flexion)) * shank, 0];
    world[hip] = [0, 0, 0];
    world[knee] = kneeP;
    world[ankle] = ankleP;
    img[hip] = [x, 0.4, 0.95];
    img[knee] = [x, 0.6, 0.95];
    img[ankle] = [ankleX, 0.85, 0.95];
  };
  build(23, 25, 27, hipX - 0.03, hipX - ankleGapX / 2);
  build(24, 26, 28, hipX + 0.03, hipX + ankleGapX / 2);
  return { img, world };
}

// angleAt sanity: straight leg → 180°, right angle → 90°
assert.equal(Math.round(angleAt([0, 0, 0], [0, 1, 0], [0, 2, 0])!), 180);
assert.equal(Math.round(angleAt([0, 0, 0], [0, 1, 0], [1, 1, 0])!), 90);

// 1) Sit-to-stand: 5 cycles of 0→90→0 over 15 s at 30 fps.
{
  const tr = new MovementTracker("sit_to_stand");
  const fps = 30;
  const total = 15 * fps;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    const flex = 45 - 45 * Math.cos((2 * Math.PI * t) / 3); // 0..90, period 3 s
    const { img, world } = legFrame(flex, 0.1);
    tr.addPose(t * 1000, img, world);
  }
  const res = tr.finalize(15);
  console.log("sit_to_stand", res.features, res.quality.state);
  assert.equal(res.quality.state, "VALID");
  assert.ok(res.features.kneeRomDeg! > 80 && res.features.kneeRomDeg! <= 91, "ROM ≈ 90");
  assert.equal(res.features.repetitions, 5);
  assert.ok(res.features.peakAngularVelocityDegS! > 60, "angular velocity measured");
  assert.equal(res.features.cadenceStepsPerMin, null);
}

// 2) Gait: ankle gap oscillates at 2 steps/s (120 steps/min) for 10 s.
{
  const tr = new MovementTracker("gait_walk");
  const fps = 30;
  const total = 10 * fps;
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    const s = Math.sin(Math.PI * t * 2);
    const gap = 0.1 + 0.08 * Math.abs(s); // peaks every 0.5 s
    const { img, world } = legFrame(20 + 10 * Math.sin(2 * Math.PI * t), gap * (s >= 0 ? 1 : -1), 0.2 + 0.06 * t);
    tr.addPose(t * 1000, img, world);
  }
  const res = tr.finalize(10);
  console.log("gait_walk", res.features, res.quality.state);
  assert.equal(res.quality.state, "VALID");
  assert.ok(Math.abs(res.features.cadenceStepsPerMin! - 120) < 8, "cadence ≈ 120");
  assert.ok(Math.abs(res.features.stepTimeS! - 0.5) < 0.05, "step time ≈ 0.5 s");
  assert.ok(res.features.stepSymmetry! > 85, "symmetric synthetic gait");
}

// 3) Too short → INSUFFICIENT; no frames → INSUFFICIENT.
{
  const tr = new MovementTracker("squat");
  for (let i = 0; i < 10; i++) {
    const { img, world } = legFrame(10, 0.1);
    tr.addPose(i * 33, img, world);
  }
  assert.equal(tr.finalize(0.3).quality.state, "INSUFFICIENT");
  assert.equal(new MovementTracker("squat").finalize(5).quality.state, "INSUFFICIENT");
}

// 4) Low visibility → side angle untrusted → no ROM.
{
  const tr = new MovementTracker("knee_flexion");
  for (let i = 0; i < 120; i++) {
    const { img, world } = legFrame(30, 0.1);
    for (const k of Object.keys(img)) img[k][2] = 0.2;
    tr.addPose(i * 33, img, world);
  }
  const res = tr.finalize(4);
  assert.equal(res.features.kneeRomDeg, null);
  assert.equal(res.quality.state, "INSUFFICIENT");
}

console.log("tracker checks passed");
```

---

## `frontend/app.json`

```json
{
  "expo": {
    "name": "frontend",
    "slug": "frontend",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "frontend",
    "userInterfaceStyle": "automatic",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.emergent.gaitanalyzer.d3svep",
      "infoPlist": {
        "NSCameraUsageDescription": "Observe joint movement during the assessment test"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "package": "com.emergent.gaitanalyzer.d3svep",
      "permissions": [
        "android.permission.CAMERA"
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-image.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#000000"
        }
      ],
      "expo-font",
      [
        "expo-camera",
        {
          "cameraPermission": "Observe joint movement during the assessment test",
          "recordAudioAndroid": false
        }
      ],
      "expo-image",
      "expo-secure-store",
      "expo-web-browser",
      "expo-status-bar",
      "expo-sqlite"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

---

## `frontend/package.json`

```json
{
  "name": "frontend",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "scripts": {
    "preinstall": "./scripts/cmd-guard.js --preinstall",
    "start": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint"
  },
  "dependencies": {
    "@expo/metro-runtime": "57.0.16",
    "@expo/vector-icons": "^15.0.2",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@tanstack/react-query": "5.102.8",
    "date-fns": "4.1.0",
    "dayjs": "1.11.13",
    "expo": "57.0.24",
    "expo-blur": "57.0.3",
    "expo-camera": "~57.0.5",
    "expo-constants": "57.0.19",
    "expo-font": "57.0.4",
    "expo-haptics": "57.0.3",
    "expo-image": "57.0.5",
    "expo-linear-gradient": "57.0.2",
    "expo-linking": "57.0.10",
    "expo-router": "57.0.22",
    "expo-secure-store": "57.0.4",
    "expo-splash-screen": "57.0.9",
    "expo-sqlite": "~57.0.3",
    "expo-status-bar": "57.0.1",
    "expo-symbols": "57.0.3",
    "expo-system-ui": "57.0.4",
    "expo-web-browser": "57.0.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.3",
    "react-native-dotenv": "3.4.11",
    "react-native-gesture-handler": "2.32.0",
    "react-native-keyboard-controller": "1.21.9",
    "react-native-reanimated": "4.5.1",
    "react-native-safe-area-context": "5.7.0",
    "react-native-screens": "4.26.2",
    "react-native-web": "0.21.2",
    "react-native-webview": "13.16.1",
    "react-native-worklets": "0.10.1"
  },
  "devDependencies": {
    "@types/react": "19.2.10",
    "eslint": "9.25.0",
    "eslint-config-expo": "57.0.2",
    "expo-doctor": "1.19.8",
    "typescript": "6.0.3"
  },
  "resolutions": {
    "@eslint/plugin-kit": "0.3.4",
    "postcss": "8.5.10",
    "uuid": "11.1.1",
    "undici": "6.27.0",
    "tar": "7.5.19",
    "**/@eslint/eslintrc/js-yaml": "4.3.0",
    "**/@expo/xcpretty/js-yaml": "4.3.0",
    "**/@istanbuljs/load-nyc-config/js-yaml": "3.15.0",
    "shell-quote": "1.9.0"
  },
  "private": true,
  "packageManager": "yarn@1.22.22+sha512.a6b2f7906b721bba3d67d4aff083df04dad64c399707841b7acf00f6b133b7ac24255f2652fa22ae3534329dc6180534e98d17432037ff6fd140556e2bb3137e"
}
```

---

## `frontend/tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": ["node_modules", "scripts/tracker-check.ts"]
}
```
