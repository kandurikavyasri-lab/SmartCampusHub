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

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    enrollmentNo: "", batch: "", department: "", phone: "", joinYear: new Date().getFullYear().toString(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Name, email, and password are required");
      return;
    }
    setLoading(true);
    setError("");
    const result = await register(form);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Registration failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  const fields: { key: keyof typeof form; label: string; placeholder: string; icon: string; keyboard?: "default" | "email-address" | "phone-pad" | "numeric" }[] = [
    { key: "name", label: "Full Name", placeholder: "Your full name", icon: "user" },
    { key: "email", label: "Email", placeholder: "University email", icon: "mail", keyboard: "email-address" },
    { key: "password", label: "Password", placeholder: "Create a password", icon: "lock" },
    { key: "enrollmentNo", label: "Enrollment No.", placeholder: "e.g. CS2022001", icon: "hash" },
    { key: "batch", label: "Batch", placeholder: "e.g. CS-2022", icon: "users" },
    { key: "department", label: "Department", placeholder: "e.g. Computer Science", icon: "book" },
    { key: "phone", label: "Phone", placeholder: "Contact number", icon: "phone", keyboard: "phone-pad" },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            paddingBottom: insets.bottom + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.secondary }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Register as a new student
        </Text>

        <View style={styles.fields}>
          {fields.map(({ key, label, placeholder, icon, keyboard }) => (
            <View key={key} style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name={icon as "user"} size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={form[key]}
                  onChangeText={(v) => updateField(key, v)}
                  autoCapitalize={key === "email" ? "none" : "words"}
                  keyboardType={keyboard ?? "default"}
                  secureTextEntry={key === "password"}
                />
              </View>
            </View>
          ))}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.registerBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.registerBtnText}>Create Account</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  topRow: { marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 6 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 28 },
  fields: { gap: 16, marginBottom: 16 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  registerBtn: {
    paddingVertical: 15, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  registerBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
