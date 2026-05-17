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

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const adminActions = [
    {
      icon: "award",
      label: "Upload Results",
      description: "Add semester & mid-term marks",
      route: "/admin/results",
      color: "#22C55E",
    },
    {
      icon: "users",
      label: "Manage Students",
      description: "Add, edit, or remove records",
      route: "/admin/students",
      color: "#3B82F6",
    },
    {
      icon: "calendar",
      label: "Update Timetable",
      description: "Modify class schedules",
      route: "/admin/timetable",
      color: "#F59E0B",
    },
    {
      icon: "send",
      label: "Send Notification",
      description: "Compose and push announcements",
      route: "/admin/send-notification",
      color: "#EC4899",
    },
  ];

  const stats = [
    { label: "Total Classes", value: timetable.length, icon: "calendar", color: "#3B82F6" },
    { label: "Notifications", value: notifications.length, icon: "bell", color: "#EC4899" },
    { label: "Mark Records", value: midMarks.length, icon: "bar-chart-2", color: "#22C55E" },
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
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Admin Panel</Text>
          <Text style={[styles.adminName, { color: colors.foreground }]}>{user?.name}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
        </Pressable>
      </View>

      <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>University Admin</Text>
          <Text style={styles.heroSub}>Manage your institution from here</Text>
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
              <Feather name={action.icon as "users"} size={24} color={action.color} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.foreground }]}>{action.label}</Text>
            <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>{action.description}</Text>
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  adminName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  logoutBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  heroBanner: {
    borderRadius: 20, padding: 22, flexDirection: "row",
    alignItems: "center", marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  heroLeft: { flex: 1 },
  heroTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  heroSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  heroIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 6, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: {
    width: "47%", borderRadius: 18, padding: 18, gap: 8, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  actionArrow: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 4 },
});
