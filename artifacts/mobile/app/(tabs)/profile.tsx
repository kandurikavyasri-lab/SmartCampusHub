import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import DropdownPicker from "@/components/DropdownPicker";
import { YEARS, BRANCHES, SECTIONS, BRANCH_FULL, ACADEMIC_YEARS } from "@/constants/academia";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    phone:            user?.phone            ?? "",
    section:          user?.section          ?? "",
    year:             user?.year             ?? "",
    branch:           user?.branch           ?? "",
    hallTicketNumber: user?.hallTicketNumber ?? "",
    academicYear:     user?.academicYear     ?? "2024-25",
  });

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const openEdit = () => {
    setEditForm({
      phone:            user?.phone            ?? "",
      section:          user?.section          ?? "",
      year:             user?.year             ?? "",
      branch:           user?.branch           ?? "",
      hallTicketNumber: user?.hallTicketNumber ?? "",
      academicYear:     user?.academicYear     ?? "2024-25",
    });
    setEditModal(true);
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      router.replace("/login");
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/login"); } },
      ]);
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile(editForm);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditModal(false);
  };

  const academicInfo = user?.role === "student" ? [
    { label: "Roll Number",       value: user?.rollNumber ?? "—",                                               icon: "hash"      },
    { label: "Hall Ticket No.",   value: user?.hallTicketNumber || user?.rollNumber || "—",                    icon: "credit-card" },
    { label: "Year of Study",     value: user?.year ? `${user.year} Year (B.Tech)` : "—",                      icon: "book"      },
    { label: "Branch",            value: user?.branch ? `${user.branch} – ${BRANCH_FULL[user.branch] ?? ""}` : "—", icon: "layers" },
    { label: "Section",           value: user?.section ? `Section ${user.section}` : "—",                     icon: "users"     },
    { label: "Academic Year",     value: user?.academicYear ?? "—",                                             icon: "calendar"  },
    { label: "Admitted",          value: user?.joinYear ? `${user.joinYear}` : "—",                            icon: "clock"     },
    { label: "Department",        value: user?.department ?? (user?.branch ? BRANCH_FULL[user.branch] : "—"),   icon: "grid"      },
  ] : [];

  const personalInfo = [
    { label: "Email",   value: user?.email ?? "—", icon: "mail"  },
    { label: "Mobile",  value: user?.phone ?? "—", icon: "phone" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100, paddingTop: Platform.OS === "web" ? 20 : 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Hero Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        {user?.role === "student" && user?.year && user?.branch && (
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user.year} Year</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user.branch}</Text>
            </View>
            {user.section && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Section {user.section}</Text>
              </View>
            )}
            {user.academicYear && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>AY {user.academicYear}</Text>
              </View>
            )}
          </View>
        )}

        {/* Hall Ticket strip */}
        {user?.role === "student" && (user?.hallTicketNumber || user?.rollNumber) && (
          <View style={styles.htStrip}>
            <Feather name="credit-card" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.htLabel}>Hall Ticket / Roll No.:</Text>
            <Text style={styles.htValue}>{user.hallTicketNumber || user.rollNumber}</Text>
          </View>
        )}

        <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name={user?.role === "admin" ? "shield" : "user"} size={12} color="#fff" />
          <Text style={styles.roleText}>{user?.role === "admin" ? "Administrator" : "B.Tech Student"}</Text>
        </View>
      </View>

      {/* Academic Details */}
      {user?.role === "student" && academicInfo.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACADEMIC DETAILS</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {academicInfo.map((item, idx) => (
              <View key={item.label}>
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name={item.icon as "hash"} size={14} color={colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
                  </View>
                </View>
                {idx < academicInfo.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Personal Info */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CONTACT INFORMATION</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {personalInfo.map((item, idx) => (
            <View key={item.label}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={item.icon as "mail"} size={14} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
                </View>
              </View>
              {idx < personalInfo.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.actionRow} onPress={openEdit}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="edit-2" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground }]}>Edit Profile</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <View style={[styles.actionIcon, { backgroundColor: colors.destructive + "18" }]}>
              <Feather name="log-out" size={16} color={colors.destructive} />
            </View>
            <Text style={[styles.actionText, { color: colors.destructive }]}>Sign Out</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setEditModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setEditModal(false)}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Cancel</Text>
            </Pressable>
            <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Edit Profile</Text>
            <Pressable onPress={handleSaveProfile}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Save</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields} keyboardShouldPersistTaps="handled">
            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Mobile Number</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="phone" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={editForm.phone}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, phone: v }))}
                  placeholder="+91 XXXXX XXXXX"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {user?.role === "student" && (
              <>
                {/* Hall Ticket */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Hall Ticket Number</Text>
                  <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                    <Feather name="credit-card" size={16} color={colors.mutedForeground} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      value={editForm.hallTicketNumber}
                      onChangeText={(v) => setEditForm((p) => ({ ...p, hallTicketNumber: v }))}
                      placeholder="e.g. 22BCS0001"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                {/* Academic Year */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Academic Year</Text>
                  <DropdownPicker
                    label="Select Academic Year"
                    value={editForm.academicYear}
                    options={ACADEMIC_YEARS}
                    onSelect={(v) => setEditForm((p) => ({ ...p, academicYear: v }))}
                    icon="calendar"
                  />
                </View>

                {/* Year */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Year of Study</Text>
                  <DropdownPicker
                    label="Select Year"
                    value={editForm.year}
                    options={YEARS}
                    onSelect={(v) => setEditForm((p) => ({ ...p, year: v }))}
                    icon="book"
                  />
                </View>

                {/* Branch */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Branch / Department</Text>
                  <DropdownPicker
                    label="Select Branch"
                    value={editForm.branch}
                    options={BRANCHES}
                    onSelect={(v) => setEditForm((p) => ({ ...p, branch: v }))}
                    icon="layers"
                  />
                </View>

                {/* Section */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Section</Text>
                  <DropdownPicker
                    label="Select Section"
                    value={editForm.section}
                    options={SECTIONS}
                    onSelect={(v) => setEditForm((p) => ({ ...p, section: v }))}
                    icon="users"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  profileCard: { borderRadius: 24, padding: 24, alignItems: "center", gap: 8, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  userName: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  userEmail: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap", justifyContent: "center" },
  badge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_500Medium" },
  htStrip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  htLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontFamily: "Inter_400Regular" },
  htValue: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { gap: 8, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 1 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginLeft: 64 },
  actionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalFields: { padding: 24, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
