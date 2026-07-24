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

import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

async function postApi(path: string, body: unknown) {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");

  async function requestCode() {
    if (!identifier.trim()) {
      setError("Enter your registered email or mobile number.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setDevCode("");
    try {
      const result = await postApi("/api/auth/forgot-password/request", { identifier: identifier.trim() });
      setMessage(result.message ?? "If the account exists, a reset code has been sent.");
      if (result.devCode) setDevCode(String(result.devCode));
      setStep("confirm");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request reset code.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!code.trim()) {
      setError("Enter the reset code.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await postApi("/api/auth/forgot-password/confirm", {
        identifier: identifier.trim(),
        code: code.trim(),
        newPassword,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 34 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.secondary }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Use your registered email or mobile number to receive a secure reset code.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.stepRow}>
            <View style={[styles.stepPill, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepText}>1</Text>
            </View>
            <View style={[styles.stepLine, { backgroundColor: step === "confirm" ? colors.primary : colors.border }]} />
            <View style={[styles.stepPill, { backgroundColor: step === "confirm" ? colors.primary : colors.secondary }]}>
              <Text style={[styles.stepText, { color: step === "confirm" ? "#fff" : colors.mutedForeground }]}>2</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email or Mobile Number</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Feather name="at-sign" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="email@college.edu or mobile number"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={step === "request"}
              />
            </View>
          </View>

          {step === "confirm" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Reset Code</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Feather name="key" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={code}
                    onChangeText={setCode}
                    placeholder="6-digit code"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>New Password</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Feather name="lock" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimum 8 characters"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword((current) => !current)}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm Password</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Feather name="check-circle" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>
            </>
          )}

          {message ? (
            <View style={[styles.noticeBox, { backgroundColor: colors.primary + "12" }]}>
              <Feather name="info" size={14} color={colors.primary} />
              <Text style={[styles.noticeText, { color: colors.primary }]}>{message}</Text>
            </View>
          ) : null}

          {devCode ? (
            <View style={[styles.devBox, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "35" }]}>
              <Text style={[styles.devLabel, { color: colors.warning }]}>Local testing code</Text>
              <Text style={[styles.devCode, { color: colors.foreground }]}>{devCode}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={step === "request" ? requestCode : resetPassword}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={styles.primaryBtnText}>{step === "request" ? "Send Reset Code" : "Update Password"}</Text>
            )}
          </Pressable>

          {step === "confirm" && (
            <Pressable style={styles.secondaryBtn} onPress={() => setStep("request")}>
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Use another email or mobile number</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center" },
  topRow: { marginBottom: 18 },
  backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 24 },
  iconBox: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 27, fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  card: { borderRadius: 20, padding: 22, borderWidth: 1, gap: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  stepPill: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  stepLine: { width: 54, height: 2 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  noticeBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 10, padding: 11 },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  devBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  devLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  devCode: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  primaryBtn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 2 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  secondaryBtn: { alignItems: "center", paddingVertical: 4 },
  secondaryBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
