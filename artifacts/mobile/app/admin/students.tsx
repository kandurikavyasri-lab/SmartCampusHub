import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
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

import { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import DropdownPicker from "@/components/DropdownPicker";
import { YEARS, BRANCHES, SECTIONS, BRANCH_FULL, TARGET_YEARS, TARGET_BRANCHES } from "@/constants/academia";

export default function ManageStudentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", year: "", branch: "", section: "", rollNumber: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    const raw = await AsyncStorage.getItem("users_v2");
    const users: User[] = raw ? JSON.parse(raw) : [];
    setStudents(users.filter((u) => u.role === "student"));
  }

  async function saveUsers(updated: User[]) {
    const raw = await AsyncStorage.getItem("users_v2");
    const all: User[] = raw ? JSON.parse(raw) : [];
    const admins = all.filter((u) => u.role === "admin");
    await AsyncStorage.setItem("users_v2", JSON.stringify([...admins, ...updated]));
  }

  const openAdd = () => {
    setEditStudent(null);
    setForm({ name: "", email: "", year: "", branch: "", section: "", rollNumber: "", phone: "" });
    setShowModal(true);
  };

  const openEdit = (s: User) => {
    setEditStudent(s);
    setForm({ name: s.name, email: s.email, year: s.year ?? "", branch: s.branch ?? "", section: s.section ?? "", rollNumber: s.rollNumber ?? s.enrollmentNo ?? "", phone: s.phone ?? "" });
    setShowModal(true);
  };

  const handleDelete = (student: User) => {
    const doDelete = () => {
      const updated = students.filter((s) => s.id !== student.id);
      setStudents(updated);
      saveUsers(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    if (Platform.OS === "web") {
      doDelete();
    } else {
      Alert.alert("Delete Student", `Remove ${student.name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    let updated: User[];
    if (editStudent) {
      updated = students.map((s) =>
        s.id === editStudent.id
          ? { ...s, ...form, batch: `${form.year}-${form.branch}`, department: BRANCH_FULL[form.branch] ?? form.branch, enrollmentNo: form.rollNumber }
          : s
      );
    } else {
      const newStudent: User = {
        id: "student-" + Date.now(),
        role: "student",
        password: "student123",
        joinYear: new Date().getFullYear().toString(),
        batch: `${form.year}-${form.branch}`,
        department: BRANCH_FULL[form.branch] ?? form.branch,
        enrollmentNo: form.rollNumber,
        hallTicketNumber: form.rollNumber,
        academicYear: "2024-25",
        ...form,
      };
      updated = [...students, newStudent];
    }
    setStudents(updated);
    await saveUsers(updated);
    setLoading(false);
    setShowModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Year filter chips
  const yearFilters = [{ label: "All", value: "All" }, ...YEARS];
  const branchFilters = TARGET_BRANCHES;

  const filtered = students.filter((s) => {
    const yearMatch  = filterYear  === "All" || s.year   === filterYear;
    const branchMatch= filterBranch=== "All" || s.branch === filterBranch;
    const searchMatch=
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.enrollmentNo ?? "").toLowerCase().includes(search.toLowerCase());
    return yearMatch && branchMatch && searchMatch;
  });

  const yearColors: Record<string, string> = { "1st": "#22C55E", "2nd": "#3B82F6", "3rd": "#F59E0B", "4th": "#EC4899" };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search */}
      <View style={[styles.topBar, { paddingTop: Platform.OS === "web" ? 8 : 0 }]}>
        <View style={[styles.searchRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name or roll number..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={openAdd}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Year filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {yearFilters.map((f) => (
          <Pressable
            key={f.value}
            style={[
              styles.filterChip,
              filterYear === f.value
                ? { backgroundColor: yearColors[f.value] ?? colors.primary }
                : { backgroundColor: colors.secondary },
            ]}
            onPress={() => setFilterYear(f.value)}
          >
            <Text style={[styles.filterChipText, { color: filterYear === f.value ? "#fff" : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Branch filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {branchFilters.map((f) => (
          <Pressable
            key={f.value}
            style={[
              styles.filterChip,
              filterBranch === f.value
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.secondary },
            ]}
            onPress={() => setFilterBranch(f.value)}
          >
            <Text style={[styles.filterChipText, { color: filterBranch === f.value ? "#fff" : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Count */}
      <View style={[styles.countRow, { paddingHorizontal: 20 }]}>
        <Text style={[styles.countText, { color: colors.mutedForeground }]}>
          {filtered.length} student{filtered.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No students found</Text>
          </View>
        ) : (
          filtered.map((s) => {
            const yColor = yearColors[s.year ?? ""] ?? colors.accent;
            return (
              <View key={s.id} style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: yColor + "20" }]}>
                  <Text style={[styles.avatarText, { color: yColor }]}>
                    {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.studentName, { color: colors.foreground }]}>{s.name}</Text>
                  <Text style={[styles.studentMeta, { color: colors.mutedForeground }]}>
                    {s.rollNumber ?? s.enrollmentNo} · {s.email}
                  </Text>
                  <View style={styles.tagRow}>
                    {s.year && (
                      <View style={[styles.tag, { backgroundColor: yColor + "18" }]}>
                        <Text style={[styles.tagText, { color: yColor }]}>{s.year} Year</Text>
                      </View>
                    )}
                    {s.branch && (
                      <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{s.branch}</Text>
                      </View>
                    )}
                    {s.section && (
                      <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.tagText, { color: colors.mutedForeground }]}>Sec {s.section}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEdit(s)}>
                    <Feather name="edit-2" size={14} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => handleDelete(s)}>
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Cancel</Text>
            </Pressable>
            <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
              {editStudent ? "Edit Student" : "Add Student"}
            </Text>
            <Pressable onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Save</Text>
              )}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields} keyboardShouldPersistTaps="handled">
            {/* Text fields */}
            {[
              { key: "name",       label: "Full Name",   placeholder: "Student full name",  icon: "user"  },
              { key: "email",      label: "Email",        placeholder: "University email",   icon: "mail"  },
              { key: "rollNumber", label: "Roll Number",  placeholder: "e.g. CS20003",       icon: "hash"  },
              { key: "phone",      label: "Phone",        placeholder: "Contact number",     icon: "phone" },
            ].map(({ key, label, placeholder, icon }) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Feather name={icon as "user"} size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={form[key as keyof typeof form]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                    autoCapitalize={key === "email" ? "none" : "words"}
                  />
                </View>
              </View>
            ))}

            {/* Dropdowns */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Year</Text>
              <DropdownPicker label="Select Year" value={form.year} options={YEARS} onSelect={(v) => setForm((p) => ({ ...p, year: v }))} icon="calendar" placeholder="Select year" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Branch</Text>
              <DropdownPicker label="Select Branch" value={form.branch} options={BRANCHES} onSelect={(v) => setForm((p) => ({ ...p, branch: v }))} icon="book" placeholder="Select branch" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Section</Text>
              <DropdownPicker label="Select Section" value={form.section} options={SECTIONS} onSelect={(v) => setForm((p) => ({ ...p, section: v }))} icon="users" placeholder="Select section" />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  searchRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  filterRow: { paddingHorizontal: 20, paddingBottom: 8, gap: 8, flexDirection: "row" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  countRow: { paddingBottom: 8 },
  countText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 20, gap: 10 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  studentCard: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderRadius: 14, padding: 14, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  studentName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  studentMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 4 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "column", gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalFields: { padding: 24, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
