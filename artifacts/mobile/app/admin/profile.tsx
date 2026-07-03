import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

export default function AdminProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editEmail, setEditEmail] = useState(user?.email ?? "");
  const [editPhone, setEditPhone] = useState(user?.phone ?? "");

  const initials = (user?.name || "Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  const openEditProfile = () => {
    setEditName(user?.name ?? "");
    setEditEmail(user?.email ?? "");
    setEditPhone(user?.phone ?? "");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert("Required details", "Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() });
      setEditOpen(false);
    } catch (error) {
      Alert.alert("Update failed", error instanceof Error ? error.message : "Could not update profile details.");
    } finally {
      setSaving(false);
    }
  };

  const uploadProfileImage = async () => {
    if (!user) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo access to upload your profile image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.82, base64: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error("Could not read the selected image.");
      const mimeType = asset.mimeType || "image/jpeg";
      const response = await fetch(getApiUrl("/api/data/users/" + user.id + "/profile-image"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ actorUserId: user.id, profileImageData: asset.base64, mimeType }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.error || "Profile image upload failed");
      await updateProfile({ profileImageUrl: data.profileImageUrl || data.user?.profileImageUrl });
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Could not upload profile image.");
    }
  };

  const rows = [
    { label: "Name", value: user?.name || "Admin User", icon: "user" },
    { label: "Email", value: user?.email || "-", icon: "mail" },
    { label: "Role", value: "Administrator", icon: "shield" },
    { label: "Phone", value: user?.phone || "Not added", icon: "phone" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }]}> 
      <View style={styles.topRow}>
        <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <View style={styles.topActions}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openEditProfile}>
            <Feather name="edit-2" size={18} color={colors.primary} />
          </Pressable>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/admin/feed")}>
            <Feather name="home" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.profileHero, { backgroundColor: colors.primary }]}> 
        <Pressable style={styles.avatarCircle} onPress={uploadProfileImage}>
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
          <View style={styles.avatarEditBadge}>
            <Feather name="camera" size={13} color="#fff" />
          </View>
        </Pressable>
        <Text style={styles.userName}>{user?.name || "Admin User"}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Feather name="shield" size={13} color="#fff" />
          <Text style={styles.roleText}>University Administrator</Text>
        </View>
        <Pressable style={styles.heroEditButton} onPress={openEditProfile}>
          <Feather name="edit-2" size={14} color="#fff" />
          <Text style={styles.heroEditText}>Edit Profile</Text>
        </Pressable>
      </View>

      <View style={[styles.navRail, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Pressable style={styles.navItem} onPress={() => router.push("/admin/feed")}> 
          <Feather name="home" size={16} color={colors.mutedForeground} />
          <Text style={[styles.navItemText, { color: colors.mutedForeground }]}>Feed</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push("/admin")}> 
          <Feather name="grid" size={16} color={colors.mutedForeground} />
          <Text style={[styles.navItemText, { color: colors.mutedForeground }]}>Manage</Text>
        </Pressable>
        <Pressable style={[styles.navItem, { backgroundColor: colors.primary }]}> 
          <Feather name="user" size={16} color="#fff" />
          <Text style={styles.navItemActiveText}>Profile</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account Information</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          {rows.map((row, index) => (
            <View key={row.label}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}> 
                  <Feather name={row.icon as "user"} size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{row.value}</Text>
                </View>
              </View>
              {index < rows.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Quick Access</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Pressable style={styles.actionRow} onPress={() => router.push("/admin/feed")}>
            <Feather name="message-square" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Campus Feed</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable style={styles.actionRow} onPress={() => router.push("/admin")}> 
            <Feather name="grid" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Admin Tools</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <Pressable style={[styles.signOutButton, { backgroundColor: colors.destructive }]} onPress={signOut}>
        <Feather name="log-out" size={18} color="#fff" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}> 
            <View style={styles.editHeader}>
              <Pressable onPress={() => setEditOpen(false)} disabled={saving}>
                <Text style={[styles.sheetActionText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Profile</Text>
              <Pressable onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.sheetActionText, { color: colors.primary }]}>Save</Text>}
              </Pressable>
            </View>
            <View style={styles.editBody}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Full Name</Text>
              <View style={[styles.inputShell, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="user" size={16} color={colors.mutedForeground} />
                <TextInput value={editName} onChangeText={setEditName} placeholder="Full name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} />
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email</Text>
              <View style={[styles.inputShell, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="mail" size={16} color={colors.mutedForeground} />
                <TextInput value={editEmail} onChangeText={setEditEmail} placeholder="Email address" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" keyboardType="email-address" style={[styles.input, { color: colors.foreground }]} />
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Phone</Text>
              <View style={[styles.inputShell, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Feather name="phone" size={16} color={colors.mutedForeground} />
                <TextInput value={editPhone} onChangeText={setEditPhone} placeholder="Contact number" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" style={[styles.input, { color: colors.foreground }]} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontFamily: "Inter_700Bold" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileHero: { borderRadius: 18, padding: 22, alignItems: "center", gap: 9 },
  avatarCircle: { width: 88, height: 88, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarEditBadge: { position: "absolute", right: 4, bottom: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(15,23,42,0.78)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.7)" },
  avatarText: { color: "#fff", fontSize: 27, fontFamily: "Inter_700Bold" },
  userName: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  userEmail: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontFamily: "Inter_500Medium" },
  roleBadge: { marginTop: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.18)", flexDirection: "row", alignItems: "center", gap: 6 },
  roleText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  heroEditButton: { marginTop: 6, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: "rgba(15,23,42,0.22)", flexDirection: "row", alignItems: "center", gap: 7 },
  heroEditText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  navRail: { borderWidth: 1, borderRadius: 16, padding: 5, flexDirection: "row", gap: 5 },
  navItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  navItemText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  navItemActiveText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  section: { gap: 9 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  actionRow: { minHeight: 56, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  actionText: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  signOutButton: { minHeight: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  signOutText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, overflow: "hidden" },
  editHeader: { minHeight: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(148,163,184,0.35)" },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetActionText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  editBody: { padding: 18, gap: 10 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", marginTop: 6 },
  inputShell: { minHeight: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
