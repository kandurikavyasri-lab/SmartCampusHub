import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function timeRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getStudentNotifications, getStudentMidMarks, getStudentTimetable } = useAppData();

  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const todayClasses = getStudentTimetable(
    user?.year ?? "",
    user?.branch ?? "",
    user?.section ?? ""
  ).filter((t) => t.day === today).sort((a, b) => a.time.localeCompare(b.time));

  const recentNotifs = getStudentNotifications(user?.year ?? "All", user?.branch ?? "All").slice(0, 3);
  const unreadCount = recentNotifs.filter((n) => !n.isRead).length;
  const myMarks = getStudentMidMarks(user?.id ?? "");
  const avgMarks = myMarks.length
    ? Math.round(myMarks.reduce((s, m) => s + ((m.midTerm1 + m.midTerm2) / (m.maxMarks * 2)) * 100, 0) / myMarks.length)
    : 0;

  const quickActions = [
    { label: "Timetable", icon: "calendar",    route: "/(tabs)/timetable",     color: "#6366F1" },
    { label: "Marks",     icon: "bar-chart-2", route: "/(tabs)/academics",     color: "#F59E0B" },
    { label: "Results",   icon: "award",       route: "/(tabs)/academics",     color: "#22C55E" },
    { label: "Syllabus",  icon: "book",        route: "/(tabs)/academics",     color: "#EC4899" },
  ];

  const firstName = user?.name?.split(" ")[0] ?? "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: insets.bottom + 100, paddingTop: Platform.OS === "web" ? 0 : 0 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroSection, { backgroundColor: colors.primary }]}>
        <View style={styles.heroContent}>
          <Text style={styles.greetingText}>{greeting},</Text>
          <Text style={styles.nameText}>{firstName}</Text>
          {user?.year && user?.branch && (
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{user.year} Year · {user.branch}</Text>
              </View>
              {user.section && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Section {user.section}</Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.dateText}>
            {today}, {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayClasses.length}</Text>
            <Text style={styles.statLabel}>Classes today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgMarks}%</Text>
            <Text style={styles.statLabel}>Avg marks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Unread</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              style={({ pressed }) => [
                styles.quickCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => router.push(a.route as "/")}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.color + "18" }]}>
                <Feather name={a.icon as "calendar"} size={22} color={a.color} />
              </View>
              <Text style={[styles.quickLabel, { color: colors.foreground }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {todayClasses.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Schedule</Text>
              <Pressable onPress={() => router.push("/(tabs)/timetable")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>See all</Text>
              </Pressable>
            </View>
            {todayClasses.slice(0, 3).map((cls) => (
              <View key={cls.id} style={[styles.classCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.classTime, { backgroundColor: colors.primary + "14" }]}>
                  <Text style={[styles.classTimeText, { color: colors.primary }]}>{cls.time}</Text>
                </View>
                <View style={styles.classInfo}>
                  <Text style={[styles.className, { color: colors.foreground }]}>{cls.subject}</Text>
                  <Text style={[styles.classMeta, { color: colors.mutedForeground }]}>
                    {cls.room} · {cls.teacher}
                  </Text>
                </View>
                <View style={[styles.subjectBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.subjectCode, { color: colors.mutedForeground }]}>{cls.subjectCode}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {recentNotifs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Notices</Text>
              <Pressable onPress={() => router.push("/(tabs)/notifications")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>See all</Text>
              </Pressable>
            </View>
            {recentNotifs.map((n) => (
              <View key={n.id} style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.notifDot, { backgroundColor: n.isRead ? colors.border : colors.accent }]} />
                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, { color: colors.foreground }]}>{n.title}</Text>
                  <Text style={[styles.notifBody, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
                </View>
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{timeRelative(n.timestamp)}</Text>
              </View>
            ))}
          </>
        )}

        {todayClasses.length === 0 && recentNotifs.length === 0 && (
          <View style={styles.emptyHint}>
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
              Your personalised schedule and notices will appear here
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  heroSection: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  heroContent: { marginBottom: 20 },
  greetingText: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontFamily: "Inter_400Regular" },
  nameText: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  badge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontFamily: "Inter_500Medium" },
  dateText: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 16, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },
  content: { padding: 20, gap: 0 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 12, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quickGrid: { flexDirection: "row", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  quickCard: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", gap: 10, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  classCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  classTime: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  classTimeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  classInfo: { flex: 1, gap: 2 },
  className: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  classMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subjectBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  subjectCode: { fontSize: 11, fontFamily: "Inter_500Medium" },
  notifCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notifContent: { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyHint: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, padding: 16, borderRadius: 12 },
  emptyHintText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
