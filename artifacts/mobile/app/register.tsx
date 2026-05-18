import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import DropdownPicker from "@/components/DropdownPicker";
import { YEARS, BRANCHES, SECTIONS, ACADEMIC_YEARS } from "@/constants/academia";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name:             "",
    email:            "",
    password:         "",
    phone:            "",
    year:             "",
    branch:           "",
    section:          "",
    rollNumber:       "",
    hallTicketNumber: "",
    academicYear:     "2024-25",
    enrollmentNo:     "",
    joinYear:         new Date().getFullYear().toString(),
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const update = (key: keyof typeof form, val: string) =>
    setForm((p) => ({ ...p, [key]: val }));

  const canGoToStep2 = form.name.trim() && form.email.trim() && form.password.trim();

  const handleRegister = async () => {
    if (!form.year || !form.branch || !form.section) {
      setError("Please select Year, Branch, and Section");
      return;
    }
    if (!form.rollNumber.trim()) {
      setError("Roll Number / Hall Ticket Number is required");
      return;
    }
    setLoading(true);
    setError("");
    const result = await register({
      ...form,
      hallTicketNumber: form.hallTicketNumber || form.rollNumber,
      enrollmentNo:     form.rollNumber,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Registration failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <View style={styles.topRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            onPress={() => (step === 2 ? setStep(1) : router.back())}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {step === 1 ? "Step 1 of 2 — Personal details" : "Step 2 of 2 — Academic details"}
        </Text>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.stepLine, { backgroundColor: step === 2 ? colors.primary : colors.border }]} />
          <View style={[styles.stepDot, { backgroundColor: step === 2 ? colors.primary : colors.border }]} />
        </View>

        {/* ── Step 1: Personal Info ── */}
        {step === 1 && (
          <View style={styles.fields}>
            {(
              [
                { key: "name",     label: "Full Name",         placeholder: "Your full name"              },
                { key: "email",    label: "Email",             placeholder: "University / personal email"  },
                { key: "password", label: "Password",          placeholder: "Create a strong password"     },
                { key: "phone",    label: "Mobile (optional)", placeholder: "+91 XXXXX XXXXX"              },
              ] as const
            ).map(({ key, label, placeholder }) => {
              const iconMap = { name: "user", email: "mail", password: "lock", phone: "phone" } as const;
              return (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
                  <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                    <Feather name={iconMap[key]} size={16} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      placeholder={placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      value={form[key]}
                      onChangeText={(v) => update(key, v)}
                      autoCapitalize={key === "name" ? "words" : "none"}
                      keyboardType={key === "phone" ? "phone-pad" : key === "email" ? "email-address" : "default"}
                      secureTextEntry={key === "password"}
                    />
                  </View>
                </View>
              );
            })}

            <Pressable
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: canGoToStep2 ? colors.primary : colors.muted, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => { if (canGoToStep2) { setError(""); setStep(2); } }}
              disabled={!canGoToStep2}
            >
              <Text style={[styles.nextBtnText, { color: canGoToStep2 ? "#fff" : colors.mutedForeground }]}>Continue</Text>
              <Feather name="arrow-right" size={16} color={canGoToStep2 ? "#fff" : colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        {/* ── Step 2: Academic Info ── */}
        {step === 2 && (
          <View style={styles.fields}>
            {/* Year */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Year of Study *</Text>
              <DropdownPicker
                label="Select Year"
                value={form.year}
                options={YEARS}
                onSelect={(v) => update("year", v)}
                icon="book"
              />
            </View>

            {/* Branch */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Branch / Department *</Text>
              <DropdownPicker
                label="Select Branch"
                value={form.branch}
                options={BRANCHES}
                onSelect={(v) => update("branch", v)}
                icon="layers"
              />
            </View>

            {/* Section */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Section *</Text>
              <DropdownPicker
                label="Select Section"
                value={form.section}
                options={SECTIONS}
                onSelect={(v) => update("section", v)}
                icon="users"
              />
            </View>

            {/* Academic Year */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Academic Year</Text>
              <DropdownPicker
                label="Select Academic Year"
                value={form.academicYear}
                options={ACADEMIC_YEARS}
                onSelect={(v) => update("academicYear", v)}
                icon="calendar"
              />
            </View>

            {/* Roll Number */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Roll Number *</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="hash" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="e.g. 22BCS0001"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.rollNumber}
                  onChangeText={(v) => {
                    update("rollNumber", v);
                    if (!form.hallTicketNumber) update("hallTicketNumber", v);
                  }}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Hall Ticket (optional, defaults to roll number) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Hall Ticket Number (if different)</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="credit-card" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Leave blank to use Roll Number"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.hallTicketNumber}
                  onChangeText={(v) => update("hallTicketNumber", v)}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Preview */}
            {form.year && form.branch && (
              <View style={[styles.previewCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
                <Feather name="info" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewText, { color: colors.primary }]}>
                    Your timetable, results, and notices will be filtered for{" "}
                    <Text style={{ fontFamily: "Inter_700Bold" }}>
                      {form.year} Year · {form.branch}{form.section ? ` · Section ${form.section}` : ""}
                    </Text>
                    {form.academicYear ? ` (AY ${form.academicYear})` : ""}
                  </Text>
                </View>
              </View>
            )}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={[styles.nextBtnText, { color: "#fff" }]}>Create Account</Text>
                  <Feather name="check" size={16} color="#fff" />
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  topRow: { marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20 },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 6 },
  fields: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  previewCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderWidth: 1, borderRadius: 12, padding: 12 },
  previewText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 4 },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
