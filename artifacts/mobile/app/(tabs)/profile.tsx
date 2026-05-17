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
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const colorScheme = useColorScheme();
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ phone: user?.phone ?? "", department: user?.department ?? "" });

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      router.replace("/login");
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ]);
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile(editForm);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditModal(false);
  };

  const infoItems = [
    { label: "Enrollment No.", value: user?.enrollmentNo ?? "—", icon: "hash" },
    { label: "Batch", value: user?.batch ?? "—", icon: "users" },
    { label: "Department", value: user?.department ?? "—", icon: "book" },
    { label: "Phone", value: user?.phone ?? "—", icon: "phone" },
    { label: "Join Year", value: user?.joinYear ?? "—", icon: "calendar" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingBottom: insets.bottom + 100,
          paddingTop: Platform.OS === "web" ? 20 : 16,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name={user?.role === "admin" ? "shield" : "user"} size={12} color="#fff" />
          <Text style={styles.roleText}>{user?.role === "admin" ? "Administrator" : "Student"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PERSONAL INFORMATION</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {infoItems.map((item, idx) => (
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
              {idx < infoItems.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              setEditForm({ phone: user?.phone ?? "", department: user?.department ?? "" });
              setEditModal(true);
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="edit-2" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.actionText, { color: colors.foreground }]}>Edit Contact Info</Text>
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

      <Modal visible={editModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setEditModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Profile</Text>
            <Pressable onPress={handleSaveProfile}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="phone" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={editForm.phone}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, phone: v }))}
                  placeholder="Contact number"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Department</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <Feather name="book" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={editForm.department}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, department: v }))}
                  placeholder="Your department"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  profileCard: {
    borderRadius: 24, padding: 28, alignItems: "center", gap: 8, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  userName: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  userEmail: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontFamily: "Inter_400Regular" },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4,
  },
  roleText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { gap: 8, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 1 },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginLeft: 64 },
  actionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  actionRow: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 14,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  modalContent: { flex: 1 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  modalSave: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalFields: { padding: 24, gap: 20 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
