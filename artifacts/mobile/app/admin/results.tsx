import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
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

import DropdownPicker from "@/components/DropdownPicker";
import { ACADEMIC_YEARS, BRANCHES, DEFAULT_ACADEMIC_YEAR, YEARS } from "@/constants/academia";
import { useAppData } from "@/context/AppDataContext";
import type { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";


type SubjectMarks = Record<string, { mid1: string; mid2: string; maxMarks: string }>;

function createInitialMarks(subjects: Array<{ code: string; name: string }>): SubjectMarks {
  return subjects.reduce<SubjectMarks>((acc, subject) => {
    acc[subject.code] = { mid1: "", mid2: "", maxMarks: "25" };
    return acc;
  }, {});
}

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export default function UploadResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addMidMark, subjects: allSubjects } = useAppData();
  const [year, setYear] = useState("");
  const [branch, setBranch] = useState("");
  const [academicYear, setAcademicYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<User[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [subjectMarks, setSubjectMarks] = useState<SubjectMarks>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const subjects = useMemo(() =>
    allSubjects
      .filter((subject) =>
        subject.year === year &&
        subject.branch === branch &&
        subject.academicYear === academicYear &&
        subject.isActive !== false
      )
      .map((subject) => ({ code: subject.code, name: subject.name })),
    [academicYear, allSubjects, branch, year]
  );

  const filteredStudents = useMemo(
    () => students.filter((s) => s.role === "student" && s.year === year && s.branch === branch && (!s.academicYear || s.academicYear === academicYear)),
    [academicYear, branch, students, year]
  );
  const studentOptions = filteredStudents.map((s) => ({
    label: s.name + " (" + (s.rollNumber || s.hallTicketNumber || s.email) + ")",
    value: s.hallTicketNumber || s.rollNumber || s.id,
  }));

  useEffect(() => {
    setSubjectMarks(createInitialMarks(subjects));
  }, [subjects]);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setStudentsLoading(true);
    try {
      const result = await apiJson<{ success: boolean; users: User[] }>("/api/data/users");
      setStudents(result.users.filter((u) => u.role === "student"));
      setError("");
    } catch (_) {
      setError("Could not load students. Please check API connection.");
    } finally {
      setStudentsLoading(false);
    }
  }

  function selectYear(nextYear: string) {
    setYear(nextYear);
    setStudentId("");
  }

  function selectBranch(nextBranch: string) {
    setBranch(nextBranch);
    setStudentId("");
  }

  function updateSubjectMark(subjectCode: string, field: "mid1" | "mid2" | "maxMarks", value: string) {
    setSubjectMarks((current) => ({
      ...current,
      [subjectCode]: {
        ...current[subjectCode],
        [field]: value,
      },
    }));
  }

  const handleSubmit = async () => {
    if (!year) { setError("Year is required"); return; }
    if (!branch) { setError("Department is required"); return; }
    if (!studentId.trim()) { setError("Please select a student"); return; }

    if (subjects.length === 0) { setError("No subjects found for this year and department. Please add subjects first."); return; }

    const parsedMarks = subjects.map((subject) => {
      const values = subjectMarks[subject.code] ?? { mid1: "", mid2: "", maxMarks: "25" };
      return {
        subject,
        mid1: Number.parseInt(values.mid1, 10),
        mid2: Number.parseInt(values.mid2, 10),
        maxMarks: Number.parseInt(values.maxMarks, 10),
      };
    });

    const invalid = parsedMarks.find(({ mid1, mid2, maxMarks }) => {
      if (!Number.isFinite(mid1) || !Number.isFinite(mid2) || !Number.isFinite(maxMarks)) return true;
      if (maxMarks <= 0 || mid1 < 0 || mid2 < 0) return true;
      return mid1 > maxMarks || mid2 > maxMarks;
    });

    if (invalid) {
      setError("Enter valid marks for all subjects. Marks must be between 0 and Max Marks.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await Promise.all(parsedMarks.map(({ subject, mid1, mid2, maxMarks }) =>
        addMidMark({
          studentId: studentId.trim(),
          subjectCode: subject.code,
          subjectName: subject.name,
          midTerm1: mid1,
          midTerm2: mid2,
          maxMarks,
          academicYear,
        })
      ));
      setSuccess(true);
      setStudentId("");
      setSubjectMarks(createInitialMarks(subjects));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSuccess(false), 2500);
    } catch (_) {
      setError("Could not save marks. Please try again.");
    } finally {
      setLoading(false);
    }
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
          Select a class and student, enter all subject marks, then save once
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Year</Text>
            <DropdownPicker
              label="Select Year"
              value={year}
              options={YEARS}
              onSelect={selectYear}
              icon="calendar"
              placeholder="Select year"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Department</Text>
            <DropdownPicker
              label="Select Department"
              value={branch}
              options={BRANCHES}
              onSelect={selectBranch}
              icon="book"
              placeholder="Select department"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Academic Year</Text>
            <DropdownPicker
              label="Select Academic Year"
              value={academicYear}
              options={ACADEMIC_YEARS}
              onSelect={setAcademicYear}
              icon="calendar"
              placeholder="Select academic year"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Student</Text>
            <DropdownPicker
              label="Select Student"
              value={studentId}
              options={studentOptions}
              onSelect={setStudentId}
              icon="user"
              placeholder={
                studentsLoading
                  ? "Loading students..."
                  : !year || !branch
                  ? "Select year and department first"
                  : studentOptions.length === 0
                  ? "No students found"
                  : "Select student"
              }
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Subject Marks</Text>
            <View style={styles.subjectMarksList}>
              {subjects.length === 0 ? (
                <View style={[styles.emptySubjectBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Feather name="info" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.emptySubjectText, { color: colors.mutedForeground }]}>No subjects found for this year and department. Add subjects from Admin &gt; Subjects.</Text>
                </View>
              ) : subjects.map((subject) => {
                const values = subjectMarks[subject.code] ?? { mid1: "", mid2: "", maxMarks: "25" };
                return (
                  <View key={subject.code} style={[styles.subjectMarkCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <View style={styles.subjectHeader}>
                      <Text style={[styles.subjectName, { color: colors.foreground }]}>{subject.name}</Text>
                      <View style={[styles.subjectCodePill, { backgroundColor: colors.primary + "18" }]}>
                        <Text style={[styles.subjectCodeText, { color: colors.primary }]}>{subject.code}</Text>
                      </View>
                    </View>
                    <View style={styles.marksGrid}>
                      <View style={styles.markField}>
                        <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>Mid 1</Text>
                        <TextInput
                          style={[styles.compactInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                          placeholder="0"
                          placeholderTextColor={colors.mutedForeground}
                          value={values.mid1}
                          onChangeText={(value) => updateSubjectMark(subject.code, "mid1", value)}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.markField}>
                        <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>Mid 2</Text>
                        <TextInput
                          style={[styles.compactInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                          placeholder="0"
                          placeholderTextColor={colors.mutedForeground}
                          value={values.mid2}
                          onChangeText={(value) => updateSubjectMark(subject.code, "mid2", value)}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.markField}>
                        <Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>Max</Text>
                        <TextInput
                          style={[styles.compactInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                          value={values.maxMarks}
                          onChangeText={(value) => updateSubjectMark(subject.code, "maxMarks", value)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
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
              <Text style={[styles.successText, { color: colors.success }]}>All subject marks saved successfully!</Text>
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
                <Text style={styles.submitBtnText}>Save All Marks</Text>
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
  smallLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  subjectMarksList: { gap: 10 },
  subjectMarkCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  emptySubjectBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  emptySubjectText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  subjectHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  subjectName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  subjectCodePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subjectCodeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  marksGrid: { flexDirection: "row", gap: 10 },
  markField: { flex: 1, gap: 5, minWidth: 72 },
  compactInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_500Medium", minHeight: 42,
  },
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
