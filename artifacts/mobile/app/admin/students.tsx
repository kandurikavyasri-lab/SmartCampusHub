import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { User } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ManageStudentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", enrollmentNo: "", batch: "", department: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    const raw = await AsyncStorage.getItem("users");
    const users: User[] = raw ? JSON.parse(raw) : [];
    setStudents(users.filter((u) => u.role === "student"));
  }

  async function saveUsers(updated: User[]) {
    const raw = await AsyncStorage.getItem("users");
    const all: User[] = raw ? JSON.parse(raw) : [];
    const admins = all.filter((u) => u.role === "admin");
    await AsyncStorage.setItem("users", JSON.stringify([...admins, ...updated]));
  }

  const openAdd = () => {
    setEditStudent(null);
    setForm({ name: "", email: "", enrollmentNo: "", batch: "", department: "", phone: "" });
    setShowModal(true);
  };

  const openEdit = (student: User) => {
    setEditStudent(student);
    setForm({ name: student.name, email: student.email, enrollmentNo: student.enrollmentNo, batch: student.batch, department: student.department, phone: student.phone });
    setShowModal(true);
  };

  const handleDelete = (student: User) => {
    if (Platform.OS === "web") {
      const updated = students.filter((s) => s.id !== student.id);
      setStudents(updated);
      saveUsers(updated);
    } else {
      Alert.alert("Delete Student", `Remove ${student.name} from records?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: () => {
            const updated = students.filter((s) => s.id !== student.id);
            setStudents(updated);
            saveUsers(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    let updated: User[];
    if (editStudent) {
      updated = students.map((s) =>
        s.id === editStudent.id ? { ...s, ...form } : s
      );
    } else {
      const newStudent: User = {
        id: "student-" + Date.now(),
        role: "student",
        password: "student123",
        joinYear: new Date().getFullYear().toString(),
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

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.enrollmentNo?.toLowerCase().includes(search.toLowerCase()) ||
      s.batch?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: Platform.OS === "web" ? 8 : 0 }]}>
        <View style={[styles.searchRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, enrollment, batch..."
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
          filtered.map((s) => (
            <View key={s.id} style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.studentName, { color: colors.foreground }]}>{s.name}</Text>
                <Text style={[styles.studentMeta, { color: colors.mutedForeground }]}>
                  {s.enrollmentNo} · {s.batch}
                </Text>
                <Text style={[styles.studentDept, { color: colors.mutedForeground }]}>{s.department}</Text>
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
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={[{ fontSize: 16, fontFamily: "Inter_400Regular", color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground }]}>
              {editStudent ? "Edit Student" : "Add Student"}
            </Text>
            <Pressable onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <Text style={[{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }]}>Save</Text>
              )}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields} keyboardShouldPersistTaps="handled">
            {[
              { key: "name", label: "Full Name", placeholder: "Student full name", icon: "user" },
              { key: "email", label: "Email", placeholder: "University email", icon: "mail" },
              { key: "enrollmentNo", label: "Enrollment No.", placeholder: "e.g. CS2022003", icon: "hash" },
              { key: "batch", label: "Batch", placeholder: "e.g. CS-2022", icon: "users" },
              { key: "department", label: "Department", placeholder: "e.g. Computer Science", icon: "book" },
              { key: "phone", label: "Phone", placeholder: "Contact number", icon: "phone" },
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  searchRow: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, gap: 10 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  studentCard: {
    flexDirection: "row", gap: 14, alignItems: "center",
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  studentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  studentMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  studentDept: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalContent: { flex: 1 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1,
  },
  modalFields: { padding: 24, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
