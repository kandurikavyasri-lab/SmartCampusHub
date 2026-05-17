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

const BATCHES = ["All", "CS-2022", "CS-2021", "CS-2020", "EE-2022", "EE-2021", "ME-2022"];

export default function SendNotificationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addNotification } = useAppData();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetBatch, setTargetBatch] = useState("All");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    await addNotification({
      title: title.trim(),
      body: body.trim(),
      targetBatch,
      sentBy: user?.id ?? "admin-001",
    });
    setLoading(false);
    setSent(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setSent(false);
      setTitle("");
      setBody("");
      setTargetBatch("All");
    }, 2500);
  };

  const charCount = body.length;

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
          Broadcast announcements to students
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Message</Text>
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{charCount}/500</Text>
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

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Target Batch</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.batchList}>
              {BATCHES.map((b) => (
                <Pressable
                  key={b}
                  style={[
                    styles.batchChip,
                    targetBatch === b
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.secondary },
                  ]}
                  onPress={() => setTargetBatch(b)}
                >
                  {b === "All" && (
                    <Feather name="globe" size={12} color={targetBatch === b ? "#fff" : colors.mutedForeground} />
                  )}
                  <Text style={[styles.batchChipText, { color: targetBatch === b ? "#fff" : colors.mutedForeground }]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Preview</Text>
            <View style={styles.previewContent}>
              <View style={[styles.previewIcon, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="bell" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {title || "Notification title"}
                </Text>
                <Text style={[styles.previewBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {body || "Your message will appear here..."}
                </Text>
              </View>
            </View>
          </View>

          {sent ? (
            <View style={[styles.successBox, { backgroundColor: colors.success + "18" }]}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>
                Notification sent to {targetBatch === "All" ? "all students" : targetBatch}!
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
                <Text style={styles.sendBtnText}>
                  Send to {targetBatch === "All" ? "All Students" : targetBatch}
                </Text>
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
  card: {
    borderRadius: 20, padding: 20, borderWidth: 1, gap: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  fieldGroup: { gap: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  textAreaWrapper: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  textArea: { fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 100, lineHeight: 22 },
  batchList: { gap: 8, flexDirection: "row" },
  batchChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  batchChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  previewCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  previewLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  previewContent: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  previewIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  previewTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  previewBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  successBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12,
  },
  successText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 14,
  },
  sendBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
