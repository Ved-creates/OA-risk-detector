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
      router.replace("/");
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
            {saving ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.continueText}>{savedPatientId ? "RETURN TO HOME" : "CONTINUE"}</Text>}
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
}));