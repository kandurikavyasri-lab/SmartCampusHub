import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ChangePasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!currentPassword || !newPassword || !confirmPassword) { setError("Enter all password fields."); return; }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("New password and confirmation do not match."); return; }
    setLoading(true);
    setError("");
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Password change failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(user?.role === "admin" ? "/admin" : "/(tabs)");
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}><Feather name="lock" size={28} color={colors.primary} /></View>
          <Text style={[styles.title, { color: colors.foreground }]}>Create New Password</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your account is using temporary credentials. Set a private password to continue.</Text>
          {[{ label: "Temporary Password", value: currentPassword, setter: setCurrentPassword }, { label: "New Password", value: newPassword, setter: setNewPassword }, { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword }].map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{field.label}</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}> 
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={field.value}
                  onChangeText={field.setter}
                  secureTextEntry={!visibleFields[field.label]}
                  placeholder={field.label}
                  placeholderTextColor={colors.mutedForeground}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setVisibleFields((current) => ({ ...current, [field.label]: !current[field.label] }))}
                >
                  <Feather name={visibleFields[field.label] ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
          ))}
          {error ? <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}><Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text></View> : null}
          <Pressable style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22 },
  card: { borderWidth: 1, borderRadius: 16, padding: 22, gap: 15 },
  iconBox: { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, marginBottom: 4 },
  fieldGroup: { gap: 7 },
  label: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, minHeight: 50, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  errorBox: { borderRadius: 10, padding: 11 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  button: { minHeight: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
