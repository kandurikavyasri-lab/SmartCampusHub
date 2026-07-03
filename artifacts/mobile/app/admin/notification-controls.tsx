import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DropdownPicker from "@/components/DropdownPicker";
import { useAuth } from "@/context/AuthContext";
import { Notification, useAppData } from "@/context/AppDataContext";
import { TARGET_BRANCHES, TARGET_YEARS, type NotifCategory } from "@/constants/academia";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: { label: string; value: "all" | NotifCategory; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { label: "All", value: "all", icon: "inbox", color: "#60A5FA" },
  { label: "General", value: "general", icon: "bell", color: "#6366F1" },
  { label: "Exam", value: "exam", icon: "edit-3", color: "#EF4444" },
  { label: "Supply", value: "supply", icon: "alert-circle", color: "#F97316" },
  { label: "Timetable", value: "timetable", icon: "calendar", color: "#3B82F6" },
  { label: "Holiday", value: "holiday", icon: "sun", color: "#22C55E" },
  { label: "Result", value: "result", icon: "award", color: "#8B5CF6" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getTargetLabel(item: Notification) {
  if (item.targetYear === "All" && item.targetBranch === "All") return "All students";
  const parts = [];
  if (item.targetYear && item.targetYear !== "All") parts.push(item.targetYear + " Year");
  if (item.targetBranch && item.targetBranch !== "All") parts.push(item.targetBranch);
  return parts.join(" - ") || "All students";
}

export default function NotificationControlsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { notifications, updateNotification, deleteNotification } = useAppData();
  const [filter, setFilter] = useState<"all" | NotifCategory>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Notification | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<NotifCategory>("general");
  const [targetYear, setTargetYear] = useState("All");
  const [targetBranch, setTargetBranch] = useState("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sortedNotifications.filter((item) => {
      const matchesCategory = filter === "all" || item.category === filter;
      const searchable = [item.title, item.body, item.category, item.targetYear, item.targetBranch].join(" ").toLowerCase();
      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [sortedNotifications, filter, query]);

  const selectedCategory = CATEGORIES.find((item) => item.value === category) ?? CATEGORIES[1];

  const openEditor = (item: Notification) => {
    setEditing(item);
    setTitle(item.title);
    setBody(item.body);
    setCategory(item.category);
    setTargetYear(item.targetYear || "All");
    setTargetBranch(item.targetBranch || "All");
    setMessage("");
  };

  const closeEditor = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setCategory("general");
    setTargetYear("All");
    setTargetBranch("All");
  };

  const saveEdit = async () => {
    if (!editing || !title.trim() || !body.trim()) return;
    setBusyId(editing.id);
    try {
      await updateNotification({
        ...editing,
        title: title.trim(),
        body: body.trim(),
        category,
        targetYear,
        targetBranch,
        targetBatch: targetYear + "-" + targetBranch,
        sentBy: user?.id ?? editing.sentBy,
      });
      setMessage("Notification updated.");
      closeEditor();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update notification.");
    } finally {
      setBusyId(null);
    }
  };

  const removeNotification = async (id: string) => {
    setBusyId(id);
    try {
      await deleteNotification(id);
      setMessage("Notification deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete notification.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/admin/feed")}><Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.primary }]}>ADMIN NOTICES</Text>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Notifications</Text>
          </View>
          <Pressable style={[styles.primaryIconButton, { backgroundColor: colors.primary }]} onPress={() => router.push("/admin/send-notification")}>
            <Feather name="plus" size={24} color="#fff" />
          </Pressable>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="bell" size={23} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Notice Administration</Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>Review, edit, and remove announcements visible to students.</Text>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search notifications"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {!!query && <Pressable onPress={() => setQuery("")}><Feather name="x" size={18} color={colors.mutedForeground} /></Pressable>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map((item) => {
            const active = filter === item.value;
            return (
              <Pressable
                key={item.label}
                onPress={() => setFilter(item.value)}
                style={[styles.filterChip, { backgroundColor: active ? item.color : colors.card, borderColor: active ? item.color : colors.border }]}
              >
                <Feather name={item.icon} size={14} color={active ? "#fff" : item.color} />
                <Text style={[styles.filterText, { color: active ? "#fff" : colors.foreground }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!!message && (
          <View style={[styles.messageBox, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Feather name={message.toLowerCase().includes("could") ? "alert-circle" : "check-circle"} size={16} color={message.toLowerCase().includes("could") ? colors.destructive : colors.primary} />
            <Text style={[styles.messageText, { color: colors.foreground }]}>{message}</Text>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Notifications</Text>
          <Text style={[styles.countText, { color: colors.mutedForeground }]}>{visibleNotifications.length} shown</Text>
        </View>

        {visibleNotifications.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Feather name="inbox" size={34} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Create a notice or adjust the current filter.</Text>
          </View>
        ) : null}

        {visibleNotifications.map((item) => {
          const meta = CATEGORIES.find((c) => c.value === item.category) ?? CATEGORIES[1];
          return (
            <View key={item.id} style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={styles.noticeTopRow}>
                <View style={[styles.categoryIcon, { backgroundColor: meta.color + "20" }]}> 
                  <Feather name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noticeTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.noticeMeta, { color: colors.mutedForeground }]}>{meta.label} - {formatDate(item.timestamp)}</Text>
                </View>
                <Pressable style={[styles.smallIcon, { backgroundColor: colors.secondary }]} onPress={() => openEditor(item)}>
                  <Feather name="edit-2" size={16} color={colors.primary} />
                </Pressable>
              </View>
              <Text style={[styles.noticeBody, { color: colors.foreground }]}>{item.body}</Text>
              <View style={styles.noticeFooter}>
                <View style={[styles.targetPill, { backgroundColor: colors.secondary }]}> 
                  <Feather name="users" size={12} color={colors.primary} />
                  <Text style={[styles.targetText, { color: colors.foreground }]}>{getTargetLabel(item)}</Text>
                </View>
                <Pressable
                  style={[styles.deleteButton, { backgroundColor: colors.destructive + "18" }]}
                  onPress={() => removeNotification(item.id)}
                  disabled={busyId === item.id}
                >
                  {busyId === item.id ? <ActivityIndicator size="small" color={colors.destructive} /> : <Feather name="trash-2" size={15} color={colors.destructive} />}
                  <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={closeEditor}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}> 
            <View style={styles.modalHeader}>
              <Pressable onPress={closeEditor}><Text style={[styles.modalActionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Notice</Text>
              <Pressable onPress={saveEdit} disabled={busyId === editing?.id || !title.trim() || !body.trim()}>
                <Text style={[styles.modalActionText, { color: colors.primary, opacity: !title.trim() || !body.trim() ? 0.5 : 1 }]}>Save</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Title</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Notification title" placeholderTextColor={colors.mutedForeground} style={[styles.editorInput, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />

              <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Message</Text>
              <TextInput value={body} onChangeText={setBody} multiline placeholder="Write the announcement" placeholderTextColor={colors.mutedForeground} style={[styles.editorTextArea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />

              <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {CATEGORIES.filter((item) => item.value !== "all").map((item) => {
                  const active = category === item.value;
                  return (
                    <Pressable key={item.label} onPress={() => setCategory(item.value as NotifCategory)} style={[styles.filterChip, { backgroundColor: active ? item.color : colors.secondary, borderColor: active ? item.color : colors.border }]}> 
                      <Feather name={item.icon} size={14} color={active ? "#fff" : item.color} />
                      <Text style={[styles.filterText, { color: active ? "#fff" : colors.foreground }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={[styles.previewNotice, { backgroundColor: selectedCategory.color + "12", borderColor: selectedCategory.color + "35" }]}> 
                <Feather name={selectedCategory.icon} size={18} color={selectedCategory.color} />
                <Text style={[styles.previewText, { color: colors.foreground }]}>{title || "Notification preview"}</Text>
              </View>

              <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Target Year</Text>
              <DropdownPicker label="Target Year" value={targetYear} options={TARGET_YEARS} onSelect={setTargetYear} icon="calendar" />
              <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Target Branch</Text>
              <DropdownPicker label="Target Branch" value={targetBranch} options={TARGET_BRANCHES} onSelect={setTargetBranch} icon="book" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryIconButton: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34 },
  heroCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 18, padding: 16 },
  heroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginTop: 2 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, minHeight: 52 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  filterRow: { flexDirection: "row", gap: 9, paddingVertical: 2 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10 },
  filterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  messageBox: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 13, padding: 12 },
  messageText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 19, fontFamily: "Inter_700Bold" },
  countText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 24, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyText: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  noticeCard: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 },
  noticeTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  categoryIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  noticeTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 22 },
  noticeMeta: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  smallIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  noticeBody: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 21 },
  noticeFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  targetPill: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  targetText: { flex: 1, fontSize: 12, fontFamily: "Inter_700Bold" },
  deleteButton: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 },
  deleteText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(148,163,184,0.35)" },
  modalTitle: { fontSize: 19, fontFamily: "Inter_700Bold" },
  modalActionText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  editorContent: { padding: 20, gap: 12 },
  editorLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  editorInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  editorTextArea: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingTop: 13, minHeight: 130, fontSize: 15, fontFamily: "Inter_500Medium", textAlignVertical: "top" },
  previewNotice: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 13 },
  previewText: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
});
