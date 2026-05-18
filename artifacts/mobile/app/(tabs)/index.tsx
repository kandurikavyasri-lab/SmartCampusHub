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
import { formatIndianDate, timeRelative } from "@/utils/dateFormat";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const CATEGORY_META: Record<string, { color: string; icon: string; label: string }> = {
  exam:      { color: "#EF4444", icon: "edit",         label: "Exam Alert"  },
  supply:    { color: "#F97316", icon: "alert-circle",  label: "Supply Exam" },
  timetable: { color: "#3B82F6", icon: "calendar",      label: "Timetable"   },
  holiday:   { color: "#22C55E", icon: "sun",            label: "Holiday"     },
  result:    { color: "#8B5CF6", icon: "award",          label: "Result"      },
  general:   { color: "#6366F1", icon: "info",           label: "Notice"      },
};

export default function DashboardScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { user }= useAuth();
  const { getStudentNotifications, getStudentMidMarks, getStudentTimetable } = useAppData();

  const todayIdx   = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const today      = DAYS[Math.min(todayIdx, 5)];
  const todayDate  = formatIndianDate(new Date().toISOString());

  const todayClasses = getStudentTimetable(
    user?.year ?? "",
    user?.branch ?? "",
    user?.section ?? ""
  ).filter((t) => t.day === today).sort((a, b) => a.time.localeCompare(b.time));

  const recentNotifs   = getStudentNotifications(user?.year ?? "All", user?.branch ?? "All").slice(0, 4);
  const unreadCount    = recentNotifs.filter((n) => !n.isRead).length;
  const myMarks        = getStudentMidMarks(user?.id ?? "");
  const avgInternal    = myMarks.length
    ? Math.round(myMarks.reduce((s, m) => s + (Math.max(m.midTerm1, m.midTerm2) / m.maxMarks) * 100, 0) / myMarks.length)
    : 0;

  const quickActions = [
    { label: "Time Table", icon: "calendar",    route: "/(tabs)/timetable", color: "#6366F1" },
    { label: "Mid Marks",  icon: "bar-chart-2", route: "/(tabs)/academics", color: "#F59E0B" },
    { label: "Results",    icon: "award",        route: "/(tabs)/academics", color: "#22C55E" },
    { label: "Syllabus",   icon: "book-open",    route: "/(tabs)/academics", color: "#EC4899" },
  ];

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Suprabhat" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "Student";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Banner */}
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
              {user.academicYear && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>AY {user.academicYear}</Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.dateText}>
            {today}  ·  {todayDate}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayClasses.length}</Text>
            <Text style={styles.statLabel}>Classes Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{avgInternal}%</Text>
            <Text style={styles.statLabel}>Internal Avg</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>New Notices</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Hall Ticket strip */}
        {user?.role === "student" && user?.rollNumber && (
          <View style={[styles.htStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.htIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="credit-card" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.htLabel, { color: colors.mutedForeground }]}>Hall Ticket / Roll Number</Text>
              <Text style={[styles.htValue, { color: colors.foreground }]}>{user.hallTicketNumber || user.rollNumber}</Text>
            </View>
            <Text style={[styles.htDept, { color: colors.mutedForeground }]}>{user.branch}</Text>
          </View>
        )}

        {/* Quick Access */}
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

        {/* Today's Schedule */}
        {todayClasses.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Time Table</Text>
              <Pressable onPress={() => router.push("/(tabs)/timetable")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>View all</Text>
              </Pressable>
            </View>
            {todayClasses.slice(0, 3).map((cls) => (
              <View key={cls.id} style={[styles.classCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.classTime, { backgroundColor: colors.primary + "14" }]}>
                  <Text style={[styles.classTimeText, { color: colors.primary }]}>{cls.time}</Text>
                  <Text style={[styles.classEndTime, { color: colors.primary + "99" }]}>{cls.endTime}</Text>
                </View>
                <View style={styles.classInfo}>
                  <Text style={[styles.className, { color: colors.foreground }]}>{cls.subject}</Text>
                  <Text style={[styles.classMeta, { color: colors.mutedForeground }]}>
                    {cls.room}  ·  {cls.teacher}
                  </Text>
                </View>
                <View style={[styles.subjectBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.subjectCode, { color: colors.mutedForeground }]}>{cls.subjectCode}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Notice Board */}
        {recentNotifs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.noticeBoardHeader}>
                <Feather name="bell" size={15} color={colors.foreground} />
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Notice Board</Text>
              </View>
              <Pressable onPress={() => router.push("/(tabs)/notifications")}>
                <Text style={[styles.seeAll, { color: colors.accent }]}>View all</Text>
              </Pressable>
            </View>
            {recentNotifs.map((n) => {
              const meta = CATEGORY_META[n.category ?? "general"] ?? CATEGORY_META.general;
              return (
                <View
                  key={n.id}
                  style={[
                    styles.notifCard,
                    {
                      backgroundColor: n.isRead ? colors.card : colors.primary + "07",
                      borderColor: n.isRead ? colors.border : meta.color + "35",
                      borderLeftColor: meta.color,
                    },
                  ]}
                >
                  <View style={[styles.notifIconBox, { backgroundColor: meta.color + "15" }]}>
                    <Feather name={meta.icon as "bell"} size={14} color={meta.color} />
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifTitleRow}>
                      <Text style={[styles.notifTitle, { color: colors.foreground }]} numberOfLines={1}>{n.title}</Text>
                      {!n.isRead && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
                    </View>
                    <Text style={[styles.notifBody, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
                    <View style={styles.notifFooter}>
                      <View style={[styles.catChip, { backgroundColor: meta.color + "15" }]}>
                        <Text style={[styles.catChipText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>{timeRelative(n.timestamp)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {todayClasses.length === 0 && recentNotifs.length === 0 && (
          <View style={[styles.emptyHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text style={[styles.emptyHintText, { color: colors.mutedForeground }]}>
              Your personalised timetable and notices will appear here after login
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  heroSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  heroContent: { marginBottom: 18 },
  greetingText: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular" },
  nameText: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  badge: { backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontFamily: "Inter_500Medium" },
  dateText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 14, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },
  content: { padding: 20, gap: 0 },
  htStrip: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 20 },
  htIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  htLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 2 },
  htValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  htDept: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 12, marginTop: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 10 },
  noticeBoardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quickGrid: { flexDirection: "row", gap: 10, marginBottom: 4, flexWrap: "wrap" },
  quickCard: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", gap: 10, borderWidth: 1 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  classCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 8 },
  classTime: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, alignItems: "center", minWidth: 52 },
  classTimeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  classEndTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  classInfo: { flex: 1, gap: 2 },
  className: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  classMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subjectBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  subjectCode: { fontSize: 10, fontFamily: "Inter_500Medium" },
  notifCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, padding: 12, borderWidth: 1, borderLeftWidth: 3, marginBottom: 8 },
  notifIconBox: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  notifContent: { flex: 1, gap: 3 },
  notifTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  notifBody: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  notifFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  catChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  notifTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  emptyHint: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1 },
  emptyHintText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
