import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppData, TimetableEntry } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const emptyForm = { day: "Monday", time: "", endTime: "", subject: "", subjectCode: "", room: "", teacher: "", batch: "CS-2022" };

export default function UpdateTimetableScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { timetable, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useAppData();
  const [selectedDay, setSelectedDay] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const dayEntries = timetable
    .filter((t) => t.day === DAYS[selectedDay])
    .sort((a, b) => a.time.localeCompare(b.time));

  const openAdd = () => {
    setEditEntry(null);
    setForm({ ...emptyForm, day: DAYS[selectedDay] });
    setShowModal(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditEntry(entry);
    setForm({ day: entry.day, time: entry.time, endTime: entry.endTime, subject: entry.subject, subjectCode: entry.subjectCode, room: entry.room, teacher: entry.teacher, batch: entry.batch });
    setShowModal(true);
  };

  const handleDelete = (entry: TimetableEntry) => {
    if (Platform.OS === "web") {
      deleteTimetableEntry(entry.id);
    } else {
      Alert.alert("Delete Entry", `Remove ${entry.subject} on ${entry.day}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: () => {
            deleteTimetableEntry(entry.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]);
    }
  };

  const handleSave = async () => {
    if (!form.subject.trim() || !form.time.trim()) return;
    setLoading(true);
    if (editEntry) {
      await updateTimetableEntry({ ...editEntry, ...form });
    } else {
      await addTimetableEntry(form);
    }
    setLoading(false);
    setShowModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.daySelector, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayContent}>
          {SHORT_DAYS.map((d, i) => (
            <Pressable
              key={d}
              style={[
                styles.dayChip,
                i === selectedDay ? { backgroundColor: colors.primary } : { backgroundColor: colors.secondary },
              ]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.dayChipText, { color: i === selectedDay ? "#fff" : colors.mutedForeground }]}>{d}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={openAdd}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32, paddingTop: Platform.OS === "web" ? 20 : 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.dayLabel, { color: colors.foreground }]}>{DAYS[selectedDay]}</Text>
        {dayEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No classes scheduled</Text>
            <Pressable onPress={openAdd} style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.addFirstBtnText}>Add class</Text>
            </Pressable>
          </View>
        ) : (
          dayEntries.map((entry) => (
            <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.timeBlock, { backgroundColor: colors.primary + "14" }]}>
                <Text style={[styles.timeText, { color: colors.primary }]}>{entry.time}</Text>
                <Text style={[styles.endTimeText, { color: colors.primary + "80" }]}>{entry.endTime}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subjectText, { color: colors.foreground }]}>{entry.subject}</Text>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {entry.room} · {entry.teacher}
                </Text>
                <Text style={[styles.batchText, { color: colors.mutedForeground }]}>Batch: {entry.batch}</Text>
              </View>
              <View style={styles.entryActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEdit(entry)}>
                  <Feather name="edit-2" size={14} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => handleDelete(entry)}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Cancel</Text>
            </Pressable>
            <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
              {editEntry ? "Edit Class" : "Add Class"}
            </Text>
            <Pressable onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Save</Text>
              )}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields} keyboardShouldPersistTaps="handled">
            {[
              { key: "subject", label: "Subject Name", placeholder: "e.g. Data Structures", icon: "book" },
              { key: "subjectCode", label: "Subject Code", placeholder: "e.g. CS301", icon: "hash" },
              { key: "time", label: "Start Time", placeholder: "e.g. 09:00", icon: "clock" },
              { key: "endTime", label: "End Time", placeholder: "e.g. 10:00", icon: "clock" },
              { key: "room", label: "Room", placeholder: "e.g. Lab 201", icon: "map-pin" },
              { key: "teacher", label: "Teacher", placeholder: "e.g. Prof. Williams", icon: "user" },
              { key: "batch", label: "Batch", placeholder: "e.g. CS-2022", icon: "users" },
            ].map(({ key, label, placeholder, icon }) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Feather name={icon as "book"} size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={form[key as keyof typeof form]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  daySelector: {
    flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingRight: 16,
    paddingTop: Platform.OS === "web" ? 8 : 0,
  },
  dayContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  dayChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20 },
  dayLabel: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 14 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  addFirstBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  addFirstBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entryCard: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10,
  },
  timeBlock: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: "center" },
  timeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  endTimeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subjectText: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  batchText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryActions: { flexDirection: "column", gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modalContent: { flex: 1 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1,
  },
  modalFields: { padding: 24, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
});
