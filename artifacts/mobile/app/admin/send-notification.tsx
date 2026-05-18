import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";
import DropdownPicker from "@/components/DropdownPicker";
import { TARGET_YEARS, TARGET_BRANCHES } from "@/constants/academia";
import type { NotifCategory } from "@/constants/academia";

const CATEGORY_OPTIONS: { label: string; value: NotifCategory; icon: string; color: string }[] = [
  { label: "General",     value: "general",   icon: "bell",          color: "#6366F1" },
  { label: "Exam Alert",  value: "exam",      icon: "edit",          color: "#EF4444" },
  { label: "Supply Exam", value: "supply",    icon: "alert-circle",  color: "#F97316" },
  { label: "Timetable",   value: "timetable", icon: "calendar",      color: "#3B82F6" },
  { label: "Holiday",     value: "holiday",   icon: "sun",           color: "#22C55E" },
  { label: "Result",      value: "result",    icon: "award",         color: "#8B5CF6" },
];

export default function SendNotificationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addNotification } = useAppData();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetYear, setTargetYear] = useState("All");
  const [targetBranch, setTargetBranch] = useState("All");
  const [category, setCategory] = useState<NotifCategory>("general");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const targetLabel = () => {
    if (targetYear === "All" && targetBranch === "All") return "All Students";
    const parts = [];
    if (targetYear !== "All") parts.push(`${targetYear} Year`);
    if (targetBranch !== "All") parts.push(targetBranch);
    return parts.join(" · ");
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    await addNotification({
      title: title.trim(),
      body: body.trim(),
      category,
      targetYear,
      targetBranch,
      targetBatch: `${targetYear}-${targetBranch}`,
      sentBy: user?.id ?? "admin-001",
    });
    setLoading(false);
    setSent(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setSent(false);
      setTitle(""); setBody(""); setTargetYear("All"); setTargetBranch("All");
    }, 2500);
  };

  const yearColors: Record<string, string> = { All: "#6366F1", "1st": "#22C55E", "2nd": "#3B82F6", "3rd": "#F59E0B", "4th": "#EC4899" };
  const currentYearColor = yearColors[targetYear] ?? colors.primary;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40, paddingTop: Platform.OS === "web" ? 20 : 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Send Notification</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Broadcast announcements to specific years, branches, or everyone
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Title</Text>
            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Feather name="type" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Notification title"
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />
            </View>
          </View>

          {/* Message */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Message</Text>
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{body.length}/500</Text>
            </View>
            <View style={[styles.textAreaWrapper, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <TextInput
                style={[styles.textArea, { color: colors.foreground }]}
                placeholder="Write your announcement here..."
                placeholderTextColor={colors.mutedForeground}
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Notice Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isActive = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    style={[
                      styles.catChip,
                      isActive
                        ? { backgroundColor: cat.color, borderColor: cat.color }
                        : { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Feather name={cat.icon as "bell"} size={12} color={isActive ? "#fff" : cat.color} />
                    <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: isActive ? "#fff" : colors.foreground }}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Target Year */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Target Year</Text>
            <DropdownPicker
              label="Target Year"
              value={targetYear}
              options={TARGET_YEARS}
              onSelect={setTargetYear}
              icon="calendar"
            />
          </View>

          {/* Target Branch */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Target Branch</Text>
            <DropdownPicker
              label="Target Branch"
              value={targetBranch}
              options={TARGET_BRANCHES}
              onSelect={setTargetBranch}
              icon="book"
            />
          </View>

          {/* Preview */}
          <View style={[styles.previewCard, { backgroundColor: currentYearColor + "10", borderColor: currentYearColor + "30" }]}>
            <Text style={[styles.previewLabel, { color: currentYearColor }]}>PREVIEW</Text>
            <View style={styles.previewContent}>
              <View style={[styles.previewIcon, { backgroundColor: currentYearColor + "20" }]}>
                <Feather name="bell" size={18} color={currentYearColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {title || "Notification title"}
                </Text>
                <Text style={[styles.previewBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {body || "Your message will appear here..."}
                </Text>
                <View style={[styles.targetBadge, { backgroundColor: currentYearColor + "18" }]}>
                  <Feather name="users" size={10} color={currentYearColor} />
                  <Text style={[styles.targetBadgeText, { color: currentYearColor }]}>→ {targetLabel()}</Text>
                </View>
              </View>
            </View>
          </View>

          {sent ? (
            <View style={[styles.successBox, { backgroundColor: colors.success + "18" }]}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>
                Sent to {targetLabel()}!
              </Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: colors.primary, opacity: pressed || loading || !title.trim() || !body.trim() ? 0.6 : 1 },
            ]}
            onPress={handleSend}
            disabled={loading || !title.trim() || !body.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.sendBtnText}>Send to {targetLabel()}</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20 },
  card: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  fieldGroup: { gap: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  textAreaWrapper: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  textArea: { fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 100, lineHeight: 22 },
  previewCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  previewLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  previewContent: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  previewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  previewTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  previewBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 6 },
  targetBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  targetBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  successText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  sendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  catChip: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
});
