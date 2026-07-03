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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { User, useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import DropdownPicker from "@/components/DropdownPicker";
import { YEARS, BRANCHES, SECTIONS, TARGET_BRANCHES } from "@/constants/academia";
import { getApiUrl } from "@/utils/api";

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}


export default function ManageStudentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<User | null>(null);
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", role: "student", password: "student123", sendCredentials: true, year: "", branch: "", section: "", rollNumber: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [credentialPreview, setCredentialPreview] = useState<{ email: string; password: string; body?: string } | null>(null);

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    try {
      const result = await apiJson<{ success: boolean; users: User[] }>("/api/data/users");
      setStudents(result.users);
    } catch (_) {
      setStudents([]);
    }
  }
  const openAdd = () => {
    setEditStudent(null);
    setMessage("");
    setCredentialPreview(null);
    setForm({ name: "", email: "", role: "student", password: "student123", sendCredentials: true, year: "", branch: "", section: "", rollNumber: "", phone: "" });
    setShowModal(true);
  };

  const openEdit = (s: User) => {
    setEditStudent(s);
    setMessage("");
    setCredentialPreview(null);
    setForm({ name: s.name, email: s.email, role: s.role, password: "", sendCredentials: false, year: s.year ?? "", branch: s.branch ?? "", section: s.section ?? "", rollNumber: s.rollNumber ?? s.enrollmentNo ?? "", phone: s.phone ?? "" });
    setShowModal(true);
  };

  const handleDelete = (student: User) => {
    const doDelete = async () => {
      await apiJson("/api/data/users/" + student.id, { method: "DELETE" });
      const updated = students.filter((s) => s.id !== student.id);
      setStudents(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    if (Platform.OS === "web") {
      doDelete();
    } else {
      Alert.alert("Delete User", "Remove " + student.name + "?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };
  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setLoading(true);
    const payload = { ...form, hallTicketNumber: form.rollNumber, academicYear: "2024-25", triggeredByUserId: currentUser?.id };
    const result = editStudent
      ? await apiJson<{ success: boolean; user: User }>("/api/data/users/" + editStudent.id, { method: "PUT", body: JSON.stringify(payload) })
      : await apiJson<{ success: boolean; user: User }>("/api/data/users", { method: "POST", body: JSON.stringify(payload) });
    const updated = editStudent
      ? students.map((s) => (s.id === editStudent.id ? result.user : s))
      : [...students, result.user];
    setStudents(updated);
    setLoading(false);
    setShowModal(false);
    const status = !editStudent && form.sendCredentials ? (result as any).credentialEmail?.deliveryStatus || (result as any).credentialEmail?.status : null;
    setMessage(!editStudent && form.sendCredentials ? (status === "sent" ? "Temporary credentials email sent and saved in history." : "Credentials were created and logged. Configure email provider to send inbox email.") : "User saved successfully.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  async function reissueCredentials(student: User) {
    setMessage("");
    setCredentialPreview(null);
    try {
      const result = await apiJson<{ success: boolean; user: User; credentialEmail?: { body?: string }; temporaryPassword: string }>("/api/data/users/" + student.id + "/credentials", {
        method: "POST",
        body: JSON.stringify({ triggeredByUserId: currentUser?.id }),
      });
      setStudents((current) => current.map((s) => (s.id === student.id ? result.user : s)));
      setCredentialPreview({ email: student.email, password: result.temporaryPassword, body: result.credentialEmail?.body });
      const status = (result as any).credentialEmail?.deliveryStatus || (result as any).credentialEmail?.status;
      setMessage(status === "sent" ? "New temporary credentials were emailed to " + student.name + "." : "New temporary credentials were generated and logged for " + student.name + ". Configure email provider to send inbox email.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {
      setMessage("Could not reissue credentials. Please check API and database.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

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

  const yearColors: Record<string, string> = { "1st": "#0F766E", "2nd": "#1D4ED8", "3rd": "#7C3AED", "4th": "#B45309" };

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

      <View style={styles.filterPanel}>
        <View style={styles.filterBlock}>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Year</Text>
          <View style={styles.filterRow}>
            {yearFilters.map((f) => (
              <Pressable
                key={f.value}
                style={[
                  styles.filterChip,
                  filterYear === f.value
                    ? { backgroundColor: yearColors[f.value] ?? colors.primary, borderColor: yearColors[f.value] ?? colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setFilterYear(f.value)}
              >
                <Text style={[styles.filterChipText, { color: filterYear === f.value ? "#fff" : colors.secondaryForeground }]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.filterBlock}>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Department</Text>
          <View style={styles.filterRow}>
            {branchFilters.map((f) => (
              <Pressable
                key={f.value}
                style={[
                  styles.filterChip,
                  filterBranch === f.value
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setFilterBranch(f.value)}
              >
                <Text style={[styles.filterChipText, { color: filterBranch === f.value ? "#fff" : colors.secondaryForeground }]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.countText, { color: colors.mutedForeground }]}>
          {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No users found</Text>
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
                    {s.rollNumber || s.enrollmentNo || "No roll number"} · {s.email}
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
              {editStudent ? "Edit User" : "Add User"}
            </Text>
            <Pressable onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Save</Text>
              )}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Account Type</Text>
              <DropdownPicker
                label="Account Type"
                value={form.role}
                options={[{ label: "Student", value: "student" }, { label: "Admin", value: "admin" }]}
                onSelect={(v) => setForm((p) => ({ ...p, role: v, password: p.password || (v === "admin" ? "admin123" : "student123") }))}
                icon="shield"
                placeholder="Select account type"
              />
            </View>
            {!editStudent && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Temporary Password</Text>
                  <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]} >
                    <Feather name="lock" size={16} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      placeholder="Temporary password"
                      placeholderTextColor={colors.mutedForeground}
                      value={form.password}
                      onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                      secureTextEntry
                    />
                  </View>
                </View>
                <Pressable
                  style={[styles.credentialToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={() => setForm((p) => ({ ...p, sendCredentials: !p.sendCredentials }))}
                >
                  <View style={[styles.checkbox, { borderColor: form.sendCredentials ? colors.primary : colors.border, backgroundColor: form.sendCredentials ? colors.primary : "transparent" }]}>
                    {form.sendCredentials ? <Feather name="check" size={13} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.credentialToggleTitle, { color: colors.foreground }]}>Send temporary credentials email</Text>
                    <Text style={[styles.credentialToggleSub, { color: colors.mutedForeground }]}>Email the temporary password, save history, and force password change after first login.</Text>
                  </View>
                </Pressable>
              </>
            )}

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
                    value={String(form[key as keyof typeof form] ?? "")}
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
  topBar: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  searchRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, minHeight: 48 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  addBtn: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterPanel: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  filterBlock: { gap: 7 },
  filterLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  filterChip: { minHeight: 34, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9, borderWidth: 1, justifyContent: "center", maxWidth: "100%", alignSelf: "flex-start" },
  filterChipText: { fontSize: 12, fontFamily: "Inter_700Bold", flexShrink: 1 },
  countText: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  noticeBox: { marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderRadius: 12, padding: 11, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  credentialBox: { marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderRadius: 12, padding: 13, gap: 5 },
  credentialTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  credentialText: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  credentialPassword: { fontSize: 15, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 20, gap: 12 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  studentCard: { flexDirection: "row", gap: 12, alignItems: "center", borderRadius: 12, padding: 14, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  studentName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  studentMeta: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 7 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  actions: { flexDirection: "column", gap: 8, marginLeft: 4 },
  actionBtn: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  credentialToggle: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  credentialToggleTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  credentialToggleSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 2 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalFields: { padding: 22, gap: 16 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, minHeight: 48 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
