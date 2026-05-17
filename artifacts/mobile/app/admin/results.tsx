import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

const SUBJECTS = [
  { code: "CS301", name: "Data Structures" },
  { code: "CS302", name: "Operating Systems" },
  { code: "CS303", name: "Database Management" },
  { code: "CS304", name: "Computer Networks" },
  { code: "CS305", name: "Software Engineering" },
  { code: "CS306", name: "Machine Learning" },
];

export default function UploadResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addMidMark } = useAppData();
  const [studentId, setStudentId] = useState("");
  const [subjectCode, setSubjectCode] = useState(SUBJECTS[0].code);
  const [mid1, setMid1] = useState("");
  const [mid2, setMid2] = useState("");
  const [maxMarks, setMaxMarks] = useState("25");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const selectedSubject = SUBJECTS.find((s) => s.code === subjectCode)!;

  const handleSubmit = async () => {
    if (!studentId.trim()) { setError("Student ID is required"); return; }
    const m1 = parseInt(mid1);
    const m2 = parseInt(mid2);
    const max = parseInt(maxMarks);
    if (isNaN(m1) || isNaN(m2) || isNaN(max)) { setError("Enter valid numeric marks"); return; }
    if (m1 > max || m2 > max) { setError(`Marks cannot exceed maximum (${max})`); return; }
    setError("");
    setLoading(true);
    await addMidMark({
      studentId: studentId.trim(),
      subjectCode,
      subjectName: selectedSubject.name,
      midTerm1: m1,
      midTerm2: m2,
      maxMarks: max,
    });
    setLoading(false);
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setSuccess(false);
      setStudentId("");
      setMid1("");
      setMid2("");
    }, 2000);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40, paddingTop: Platform.OS === "web" ? 20 : 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Upload Mid-term Marks</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Enter marks for a student per subject
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Student ID</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Feather name="user" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="e.g. student-001"
                placeholderTextColor={colors.mutedForeground}
                value={studentId}
                onChangeText={setStudentId}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectList}>
              {SUBJECTS.map((s) => (
                <Pressable
                  key={s.code}
                  style={[
                    styles.subjectChip,
                    subjectCode === s.code
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.secondary },
                  ]}
                  onPress={() => setSubjectCode(s.code)}
                >
                  <Text style={[styles.subjectChipText, { color: subjectCode === s.code ? "#fff" : colors.mutedForeground }]}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.marksRow}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Mid-term 1</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  value={mid1}
                  onChangeText={setMid1}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Mid-term 2</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  value={mid2}
                  onChangeText={setMid2}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Max Marks</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={maxMarks}
                  onChangeText={setMaxMarks}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.successBox, { backgroundColor: colors.success + "18" }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>Marks saved successfully!</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="upload" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Save Marks</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20 },
  card: {
    borderRadius: 20, padding: 20, borderWidth: 1, gap: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  subjectList: { gap: 8, paddingVertical: 4 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  subjectChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  marksRow: { flexDirection: "row", gap: 10 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  successBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  successText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
