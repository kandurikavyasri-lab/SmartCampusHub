import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import { DEFAULT_ACADEMIC_YEAR, type NotifCategory } from "@/constants/academia";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: { key: "all" | NotifCategory; label: string; icon: string; color: string }[] = [
  { key: "all",       label: "All",         icon: "bell",          color: "#6366F1" },
  { key: "exam",      label: "Exam Alert",  icon: "edit",          color: "#EF4444" },
  { key: "supply",    label: "Supply Exam", icon: "alert-circle",  color: "#F97316" },
  { key: "timetable", label: "Timetable",   icon: "calendar",      color: "#3B82F6" },
  { key: "holiday",   label: "Holiday",     icon: "sun",           color: "#22C55E" },
  { key: "result",    label: "Result",      icon: "award",         color: "#8B5CF6" },
  { key: "general",   label: "General",     icon: "info",          color: "#6B7280" },
];

function getCatMeta(cat: string) {
  return CATEGORIES.find((c) => c.key === cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { markNotificationRead, getStudentNotifications } = useAppData();
  const [activeFilter, setActiveFilter] = useState<"all" | NotifCategory>("all");

  const allNotifs = getStudentNotifications(user?.year ?? "All", user?.branch ?? "All");
  const unread    = allNotifs.filter((n) => !n.isRead).length;

  const filtered = activeFilter === "all"
    ? allNotifs
    : allNotifs.filter((n) => (n.category ?? "general") === activeFilter);

  const handlePress = async (id: string, isRead: boolean) => {
    if (!isRead) {
      await markNotificationRead(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100, paddingTop: Platform.OS === "web" ? 20 : 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.foreground }]}>Notice Board</Text>
            {user?.year && user?.branch && (
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                {user.year} Year · {user.branch} · AY {user.academicYear ?? DEFAULT_ACADEMIC_YEAR}
              </Text>
            )}
          </View>
          {unread > 0 && (
            <View style={[styles.unreadPill, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.unreadPillText}>{unread} New</Text>
            </View>
          )}
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={{ flexGrow: 0 }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.key;
            const count    = cat.key === "all"
              ? allNotifs.length
              : allNotifs.filter((n) => (n.category ?? "general") === cat.key).length;
            if (count === 0 && cat.key !== "all") return null;
            return (
              <Pressable
                key={cat.key}
                style={[
                  styles.filterChip,
                  isActive
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setActiveFilter(cat.key)}
              >
                <Feather name={cat.icon as "bell"} size={12} color={isActive ? "#fff" : cat.color} />
                <Text style={[styles.filterChipText, { color: isActive ? "#fff" : colors.foreground }]}>
                  {cat.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterCount, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : cat.color + "18" }]}>
                    <Text style={[styles.filterCountText, { color: isActive ? "#fff" : cat.color }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Notice List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notices</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {activeFilter === "all" ? "No announcements yet" : `No ${CATEGORIES.find(c=>c.key===activeFilter)?.label ?? "notices"} found`}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((n) => {
              const meta = getCatMeta(n.category ?? "general");
              return (
                <Pressable
                  key={n.id}
                  style={({ pressed }) => [
                    styles.noticeCard,
                    {
                      backgroundColor: n.isRead ? colors.card : colors.background,
                      borderColor: n.isRead ? colors.border : meta.color + "30",
                      borderLeftColor: meta.color,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                  onPress={() => handlePress(n.id, n.isRead)}
                >
                  {/* Category color bar is the left border */}
                  <View style={styles.noticeTop}>
                    <View style={[styles.noticeIconWrap, { backgroundColor: meta.color + "15" }]}>
                      <Feather name={meta.icon as "bell"} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.noticeTitleRow}>
                        <Text style={[styles.noticeTitle, { color: colors.foreground }]}>{n.title}</Text>
                        {!n.isRead && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
                      </View>
                      <View style={styles.noticeMeta}>
                        <View style={[styles.catBadge, { backgroundColor: meta.color + "15" }]}>
                          <Text style={[styles.catBadgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        {(n.targetYear !== "All" || n.targetBranch !== "All") && (
                          <View style={[styles.targetBadge, { backgroundColor: colors.secondary }]}>
                            <Text style={[styles.targetBadgeText, { color: colors.mutedForeground }]}>
                              {[n.targetYear !== "All" ? `${n.targetYear} Yr` : "", n.targetBranch !== "All" ? n.targetBranch : ""]
                                .filter(Boolean).join(" · ")}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.noticeBody, { color: colors.mutedForeground }]}>{n.body}</Text>

                  <View style={[styles.noticeFooter, { borderTopColor: colors.border }]}>
                    <Feather name="clock" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.noticeTime, { color: colors.mutedForeground }]}>
                      {formatIndianDate(n.timestamp)}  ·  {timeRelative(n.timestamp)}
                    </Text>
                    {n.isRead ? (
                      <View style={styles.readBadge}>
                        <Feather name="check" size={10} color={colors.mutedForeground} />
                        <Text style={[styles.readText, { color: colors.mutedForeground }]}>Read</Text>
                      </View>
                    ) : (
                      <View style={[styles.newBadge, { backgroundColor: meta.color + "15" }]}>
                        <Text style={[styles.newBadgeText, { color: meta.color }]}>New</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  headerLeft: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  unreadPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  unreadPillText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 14 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, maxWidth: "100%" },
  filterChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  filterCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  list: { gap: 10 },
  noticeCard: { borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  noticeTop: { flexDirection: "row", gap: 10, padding: 14, paddingBottom: 10 },
  noticeIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  noticeTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  noticeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 19 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  noticeMeta: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  targetBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  targetBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  noticeBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, paddingHorizontal: 14, paddingBottom: 10 },
  noticeFooter: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1 },
  noticeTime: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  readBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  readText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  newBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  newBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  emptyState: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
