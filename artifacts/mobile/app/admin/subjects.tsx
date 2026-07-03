import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DropdownPicker from "@/components/DropdownPicker";
import { BRANCHES, TARGET_BRANCHES, YEARS } from "@/constants/academia";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

type Subject = {
  id: string;
  code: string;
  name: string;
  year: string;
  branch: string;
  semester: number;
  credits: number;
  academicYear: string;
  isActive?: boolean;
};

async function apiJson<T>(requestPath: string, options?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(requestPath), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Could not connect to the API");
  return data as T;
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ label: "Semester " + n, value: String(n) }));
const CREDITS = [1, 2, 3, 4, 5].map((n) => ({ label: n + " Credits", value: String(n) }));
const allYears = [{ label: "All", value: "All" }, ...YEARS];

export default function ManageSubjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterYear, setFilterYear] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ code: "", name: "", year: "", branch: "", semester: "1", credits: "3", academicYear: "2024-25" });

  useEffect(() => { loadSubjects(); }, []);

  async function loadSubjects() {
    setLoadingList(true);
    setMessage("");
    try {
      const result = await apiJson<{ success: boolean; subjects: Subject[] }>("/api/data/subjects");
      setSubjects(result.subjects ?? []);
    } catch (_) {
      setMessage("Subjects could not be loaded. Please run db push, start the API, and try again.");
    } finally {
      setLoadingList(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setMessage("");
    setForm({ code: "", name: "", year: "", branch: "", semester: "1", credits: "3", academicYear: "2024-25" });
    setShowModal(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setMessage("");
    setForm({
      code: subject.code,
      name: subject.name,
      year: subject.year,
      branch: subject.branch,
      semester: String(subject.semester),
      credits: String(subject.credits),
      academicYear: subject.academicYear || "2024-25",
    });
    setShowModal(true);
  }

  async function saveSubject() {
    if (!form.code.trim() || !form.name.trim() || !form.year || !form.branch) {
      setMessage("Enter subject code, name, year, and department.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const payload = { ...form, semester: Number(form.semester), credits: Number(form.credits) };
      const result = editing
        ? await apiJson<{ success: boolean; subject: Subject }>("/api/data/subjects/" + editing.id, { method: "PUT", body: JSON.stringify(payload) })
        : await apiJson<{ success: boolean; subject: Subject }>("/api/data/subjects", { method: "POST", body: JSON.stringify(payload) });
      setSubjects((current) => editing ? current.map((s) => s.id === editing.id ? result.subject : s) : [result.subject, ...current]);
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {
      setMessage("Could not save subject. Please check API connection and database table.");
    } finally {
      setLoading(false);
    }
  }

  function deleteSubject(subject: Subject) {
    const run = async () => {
      setMessage("");
      try {
        await apiJson("/api/data/subjects/" + subject.id, { method: "DELETE" });
        setSubjects((current) => current.filter((s) => s.id !== subject.id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {
        setMessage("Could not remove subject. Please try again.");
      }
    };
    if (Platform.OS === "web") run();
    else Alert.alert("Remove Subject", "Remove " + subject.name + "?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: run },
    ]);
  }

  const filtered = useMemo(() => subjects.filter((subject) => {
    const yearMatch = filterYear === "All" || subject.year === filterYear;
    const branchMatch = filterBranch === "All" || subject.branch === filterBranch;
    return yearMatch && branchMatch && subject.isActive !== false;
  }), [filterBranch, filterYear, subjects]);

  const departmentCount = new Set(subjects.filter((s) => s.isActive !== false).map((s) => s.branch)).size;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="book-open" size={24} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>Curriculum Subjects</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Maintain department subjects used for marks entry and student views.</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]} onPress={openAdd}>
            <Feather name="plus" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.statValue, { color: colors.foreground }]}>{subjects.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Subjects</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.statValue, { color: colors.foreground }]}>{departmentCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Departments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.statValue, { color: colors.foreground }]}>{filtered.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Showing</Text>
          </View>
        </View>

        {message ? (
          <View style={[styles.notice, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "45" }]}> 
            <Feather name="info" size={16} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>{message}</Text>
          </View>
        ) : null}

        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>Filters</Text>
            <TouchableOpacity onPress={loadSubjects} style={[styles.refreshBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.75}>
              <Feather name="refresh-cw" size={15} color={colors.secondaryForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.filterRow}>
            {allYears.map((f) => (
              <Pressable key={f.value} onPress={() => setFilterYear(f.value)} style={[styles.filterChip, filterYear === f.value ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.filterText, { color: filterYear === f.value ? "#fff" : colors.secondaryForeground }]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.filterRow}>
            {TARGET_BRANCHES.map((f) => (
              <Pressable key={f.value} onPress={() => setFilterBranch(f.value)} style={[styles.filterChip, filterBranch === f.value ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.filterText, { color: filterBranch === f.value ? colors.accentForeground : colors.secondaryForeground }]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loadingList ? (
          <View style={styles.loadingBox}><ActivityIndicator color={colors.primary} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading subjects...</Text></View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Feather name="book" size={34} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No subjects found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add subjects manually or run the database subject sync command.</Text>
            <Pressable onPress={openAdd} style={[styles.emptyButton, { backgroundColor: colors.primary }]}> 
              <Text style={styles.emptyButtonText}>Add Subject</Text>
            </Pressable>
          </View>
        ) : filtered.map((subject) => (
          <View key={subject.id} style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.codeBox, { backgroundColor: colors.primary + "16" }]}> 
              <Text style={[styles.codeText, { color: colors.primary }]}>{subject.code}</Text>
            </View>
            <View style={styles.subjectBody}>
              <Text style={[styles.subjectName, { color: colors.foreground }]} numberOfLines={2}>{subject.name}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaPill, { color: colors.mutedForeground, backgroundColor: colors.secondary }]}>{subject.year} Year</Text>
                <Text style={[styles.metaPill, { color: colors.mutedForeground, backgroundColor: colors.secondary }]}>{subject.branch}</Text>
                <Text style={[styles.metaPill, { color: colors.mutedForeground, backgroundColor: colors.secondary }]}>Sem {subject.semester}</Text>
              </View>
              <Text style={[styles.creditText, { color: colors.mutedForeground }]}>{subject.credits} credits | AY {subject.academicYear}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEdit(subject)}>
                <Feather name="edit-2" size={15} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => deleteSubject(subject)}>
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}> 
            <Pressable onPress={() => setShowModal(false)}><Text style={[styles.modalAction, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editing ? "Edit Subject" : "Add Subject"}</Text>
            <Pressable onPress={saveSubject} disabled={loading}>{loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.modalAction, { color: colors.primary }]}>Save</Text>}</Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields} keyboardShouldPersistTaps="handled">
            {[{ key: "code", label: "Subject Code", placeholder: "CS501" }, { key: "name", label: "Subject Name", placeholder: "Database Management Systems" }, { key: "academicYear", label: "Academic Year", placeholder: "2024-25" }].map((field) => (
              <View key={field.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{field.label}</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <TextInput style={[styles.input, { color: colors.foreground }]} placeholder={field.placeholder} placeholderTextColor={colors.mutedForeground} value={form[field.key as keyof typeof form]} onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))} autoCapitalize={field.key === "code" ? "characters" : "words"} />
                </View>
              </View>
            ))}
            <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Year</Text><DropdownPicker label="Year" value={form.year} options={YEARS} onSelect={(value) => setForm((current) => ({ ...current, year: value }))} icon="calendar" placeholder="Select year" /></View>
            <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Department</Text><DropdownPicker label="Department" value={form.branch} options={BRANCHES} onSelect={(value) => setForm((current) => ({ ...current, branch: value }))} icon="book" placeholder="Select department" /></View>
            <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Semester</Text><DropdownPicker label="Semester" value={form.semester} options={SEMESTERS} onSelect={(value) => setForm((current) => ({ ...current, semester: value }))} icon="layers" /></View>
            <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Credits</Text><DropdownPicker label="Credits" value={form.credits} options={CREDITS} onSelect={(value) => setForm((current) => ({ ...current, credits: value }))} icon="award" /></View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, gap: 14 },
  hero: { borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 18 },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  panel: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  refreshBtn: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8, maxWidth: "100%", alignSelf: "flex-start" },
  filterText: { fontSize: 12, fontFamily: "Inter_700Bold", flexShrink: 1 },
  loadingBox: { paddingVertical: 46, alignItems: "center", gap: 10 },
  emptyState: { borderWidth: 1, borderRadius: 14, padding: 28, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  emptyButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  emptyButtonText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  subjectCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  codeBox: { width: 62, minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  codeText: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  subjectBody: { flex: 1, minWidth: 0 },
  subjectName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 7, lineHeight: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metaPill: { overflow: "hidden", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontFamily: "Inter_700Bold" },
  creditText: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 6 },
  actions: { gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalAction: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalFields: { padding: 22, gap: 16 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  inputRow: { borderWidth: 1, borderRadius: 10, minHeight: 48, paddingHorizontal: 14, justifyContent: "center" },
  input: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
