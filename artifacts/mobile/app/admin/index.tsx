import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { timetable, notifications, midMarks } = useAppData();
  const initials = (user?.name || "Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const adminActions = [
    {
      icon: "book-open",
      label: "Subjects",
      description: "Manage year-wise curriculum",
      route: "/admin/subjects",
      color: "#0F766E",
    },
    {
      icon: "message-square",
      label: "Feed Management",
      description: "Publish campus feed updates",
      route: "/admin/feed",
      color: "#0369A1",
    },
    {
      icon: "award",
      label: "Upload Results",
      description: "Add semester & mid-term marks",
      route: "/admin/results",
      color: "#7C3AED",
    },
    {
      icon: "users",
      label: "Manage Students",
      description: "Add, edit, or remove records",
      route: "/admin/students",
      color: "#1D4ED8",
    },
    {
      icon: "calendar",
      label: "Update Timetable",
      description: "Modify class schedules",
      route: "/admin/timetable",
      color: "#B45309",
    },
    {
      icon: "send",
      label: "Send Notification",
      description: "Compose and push announcements",
      route: "/admin/send-notification",
      color: "#7C3AED",
    },
    {
      icon: "upload-cloud",
      label: "Bulk Upload",
      description: "Upload PDF/CSV marks for a class",
      route: "/admin/bulk-upload",
      color: "#475569",
    },
  ];

  const stats = [
    { label: "Total Classes", value: timetable.length, icon: "calendar", color: "#1D4ED8" },
    { label: "Notifications", value: notifications.length, icon: "bell", color: "#7C3AED" },
    { label: "Mark Records", value: midMarks.length, icon: "bar-chart-2", color: "#0F766E" },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        {
          paddingBottom: insets.bottom + 32,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.screenTopRow}>
        <Pressable style={[styles.roundIconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/admin/feed")}>
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Admin Tools</Text>
        <Pressable style={[styles.roundIconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/admin/profile")}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </Pressable>
      </View>

      <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>University Operations</Text>
          <Text style={styles.heroSub}>Curriculum, students, results, schedules, and campus communication</Text>
        </View>
        <View style={[styles.heroIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <Feather name="shield" size={32} color="#fff" />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
              <Feather name={s.icon as "bell"} size={18} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {adminActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(action.route as "/")}
            activeOpacity={0.75}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + "18" }]}>
              <Feather name={action.icon as "users"} size={22} color={action.color} />
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
              <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>{action.description}</Text>
            </View>
            <View style={[styles.actionArrow, { backgroundColor: action.color + "14" }]}>
              <Feather name="arrow-right" size={14} color={action.color} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  screenTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  screenTitle: { flex: 1, textAlign: "center", fontSize: 21, fontFamily: "Inter_700Bold" },
  roundIconButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  greeting: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0 },
  adminName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  profileButton: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  heroBanner: {
    borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroLeft: { flex: 1 },
  heroTitle: { color: "#fff", fontSize: 21, fontFamily: "Inter_700Bold", marginBottom: 5 },
  heroSub: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  heroIcon: { width: 54, height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navRail: { borderWidth: 1, borderRadius: 16, padding: 5, flexDirection: "row", gap: 5, marginBottom: 22 },
  navItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  navItemText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  navItemActiveText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 13, alignItems: "center", gap: 6, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 21, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 13 },
  actionsGrid: { gap: 10 },
  actionCard: {
    width: "100%", borderRadius: 12, padding: 15, gap: 10, borderWidth: 1, flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionTextBlock: { flex: 1, gap: 3 },
  actionLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  actionArrow: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", marginLeft: "auto" },
});
