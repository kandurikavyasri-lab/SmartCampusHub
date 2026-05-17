import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const NOTIF_ICONS: Record<string, string> = {
  exam: "edit",
  result: "award",
  holiday: "sun",
  library: "book",
  seminar: "mic",
  default: "bell",
};

function getNotifIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("exam")) return NOTIF_ICONS.exam;
  if (lower.includes("result")) return NOTIF_ICONS.result;
  if (lower.includes("holiday")) return NOTIF_ICONS.holiday;
  if (lower.includes("library")) return NOTIF_ICONS.library;
  if (lower.includes("seminar") || lower.includes("lecture")) return NOTIF_ICONS.seminar;
  return NOTIF_ICONS.default;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { markNotificationRead, getStudentNotifications } = useAppData();

  const notifications = getStudentNotifications(user?.batch ?? "All");
  const unread = notifications.filter((n) => !n.isRead).length;

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
          {
            paddingBottom: insets.bottom + 100,
            paddingTop: Platform.OS === "web" ? 20 : 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
          {unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.unreadText}>{unread} new</Text>
            </View>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              No announcements yet
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((n, idx) => (
              <Pressable
                key={n.id}
                style={({ pressed }) => [
                  styles.notifCard,
                  {
                    backgroundColor: n.isRead ? colors.card : colors.primary + "0A",
                    borderColor: n.isRead ? colors.border : colors.primary + "40",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => handlePress(n.id, n.isRead)}
              >
                <View style={[styles.iconContainer, { backgroundColor: n.isRead ? colors.secondary : colors.primary + "18" }]}>
                  <Feather
                    name={getNotifIcon(n.title) as "bell"}
                    size={18}
                    color={n.isRead ? colors.mutedForeground : colors.primary}
                  />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTop}>
                    <Text style={[styles.notifTitle, { color: colors.foreground }]}>{n.title}</Text>
                    {!n.isRead && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
                  </View>
                  <Text style={[styles.notifBody, { color: colors.mutedForeground }]}>{n.body}</Text>
                  <View style={styles.notifMeta}>
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {formatDate(n.timestamp)}
                    </Text>
                    {n.targetBatch !== "All" && (
                      <View style={[styles.batchChip, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.batchText, { color: colors.mutedForeground }]}>{n.targetBatch}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  unreadBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  unreadText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { gap: 10 },
  notifCard: {
    flexDirection: "row", gap: 14, borderRadius: 16,
    padding: 14, borderWidth: 1,
  },
  iconContainer: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notifContent: { flex: 1, gap: 5 },
  notifTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  notifMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  batchChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  batchText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
