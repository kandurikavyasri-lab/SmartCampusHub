import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
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

import DropdownPicker from "@/components/DropdownPicker";
import { BRANCHES, SECTIONS, YEARS } from "@/constants/academia";
import { TimetableEntry, useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const emptyForm = {
  day: "Monday", time: "", endTime: "",
  subject: "", subjectCode: "", room: "", teacher: "",
  year: "", branch: "", section: "", batch: "",
};

export default function UpdateTimetableScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { timetable, subjects, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useAppData();
  const [selectedDay, setSelectedDay] = useState(0);
  const [filterYear, setFilterYear] = useState("All");
  const [filterBranch, setFilterBranch] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const yearFilters = [{ label: "All", value: "All" }, ...YEARS];
  const branchFilters = [{ label: "All", value: "All" }, ...BRANCHES];

  const subjectOptions = useMemo(() =>
    subjects
      .filter((subject) => subject.isActive !== false && subject.year === form.year && subject.branch === form.branch)
      .map((subject) => ({ label: subject.name + " (" + subject.code + ")", value: subject.code })),
    [form.branch, form.year, subjects]
  );

  function selectSubject(subjectCode: string) {
    const selected = subjects.find((subject) => subject.code === subjectCode && subject.year === form.year && subject.branch === form.branch);
    setForm((current) => ({
      ...current,
      subjectCode,
      subject: selected?.name ?? current.subject,
    }));
  }

  function selectYear(value: string) {
    setForm((current) => ({ ...current, year: value, subject: "", subjectCode: "" }));
  }

  function selectBranch(value: string) {
    setForm((current) => ({ ...current, branch: value, subject: "", subjectCode: "" }));
  }

  const dayEntries = useMemo(() => timetable
    .filter((t) => {
      const dayMatch = t.day === DAYS[selectedDay];
      const yearMatch = filterYear === "All" || t.year === filterYear;
      const branchMatch = filterBranch === "All" || t.branch === filterBranch;
      return dayMatch && yearMatch && branchMatch;
    })
    .sort((a, b) => a.time.localeCompare(b.time)), [filterBranch, filterYear, selectedDay, timetable]);

  const openAdd = () => {
    setEditEntry(null);
    setMessage("");
    setForm({ ...emptyForm, day: DAYS[selectedDay] });
    setShowModal(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditEntry(entry);
    setMessage("");
    setForm({ day: entry.day, time: entry.time, endTime: entry.endTime, subject: entry.subject, subjectCode: entry.subjectCode, room: entry.room, teacher: entry.teacher, year: entry.year ?? "", branch: entry.branch ?? "", section: entry.section ?? "", batch: entry.batch ?? "" });
    setShowModal(true);
  };

  const handleDelete = (entry: TimetableEntry) => {
    const doDelete = async () => {
      setMessage("");
      try {
        await deleteTimetableEntry(entry.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {
        setMessage("Could not delete this class. Please check the API and try again.");
      }
    };
    if (Platform.OS === "web") doDelete();
    else Alert.alert("Delete Entry", "Remove " + entry.subject + "?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: doDelete }]);
  };

  const handleSave = async () => {
    if (!form.year || !form.branch || !form.subjectCode || !form.time.trim() || !form.endTime.trim()) {
      setMessage("Select year, department, subject, start time, and end time.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const entryData = { ...form, batch: form.year + "-" + form.branch };
      if (editEntry) await updateTimetableEntry({ ...editEntry, ...entryData });
      else await addTimetableEntry(entryData);
      setShowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {
      setMessage("Could not save timetable. Please check the API connection.");
    } finally {
      setLoading(false);
    }
  };

  const yearColors: Record<string, string> = { "1st": "#15803D", "2nd": "#1D4ED8", "3rd": "#B45309", "4th": "#BE185D" };
  const shownLabel = filterYear === "All" && filterBranch === "All" ? "All classes" : [filterYear, filterBranch].filter((x) => x !== "All").join(" | ");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="calendar" size={24} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.title, { color: colors.foreground }]}>Academic Timetable</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Plan classes by day, department, year, room, and faculty.</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]} onPress={openAdd}>
            <Feather name="plus" size={22} color="#fff" />
          </Pressable>
        </View>

        {message ? (
          <View style={[styles.notice, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "45" }]}> 
            <Feather name="info" size={16} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>{message}</Text>
          </View>
        ) : null}

        <View style={[styles.filterPanel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>Schedule Filters</Text>
          <View style={styles.dayContent}>
            {SHORT_DAYS.map((day, index) => (
              <Pressable key={day} style={[styles.dayChip, index === selectedDay ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => setSelectedDay(index)}>
                <Text style={[styles.dayChipText, { color: index === selectedDay ? "#fff" : colors.secondaryForeground }]}>{day}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.filterRow}>
            {yearFilters.map((f) => (
              <Pressable key={f.value} style={[styles.filterChip, filterYear === f.value ? { backgroundColor: yearColors[f.value] ?? colors.primary, borderColor: yearColors[f.value] ?? colors.primary } : { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => setFilterYear(f.value)}>
                <Text style={[styles.filterChipText, { color: filterYear === f.value ? "#fff" : colors.secondaryForeground }]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.filterRow}>
            {branchFilters.map((f) => (
              <Pressable key={f.value} style={[styles.filterChip, filterBranch === f.value ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => setFilterBranch(f.value)}>
                <Text style={[styles.filterChipText, { color: filterBranch === f.value ? colors.accentForeground : colors.secondaryForeground }]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.dayLabel, { color: colors.foreground }]}>{DAYS[selectedDay]}</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{shownLabel} | {dayEntries.length} classes</Text>
          </View>
          <TouchableOpacity onPress={openAdd} style={[styles.smallAdd, { backgroundColor: colors.secondary }]} activeOpacity={0.75}>
            <Feather name="plus" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {dayEntries.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Feather name="calendar" size={34} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No classes scheduled</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add a class for this day or adjust the selected filters.</Text>
            <Pressable onPress={openAdd} style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.addFirstBtnText}>Add Class</Text>
            </Pressable>
          </View>
        ) : (
          dayEntries.map((entry) => {
            const yColor = yearColors[entry.year ?? ""] ?? colors.primary;
            return (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <View style={[styles.timeBlock, { backgroundColor: colors.primary + "14" }]}> 
                  <Text style={[styles.timeText, { color: colors.primary }]}>{entry.time}</Text>
                  <View style={[styles.timeLine, { backgroundColor: colors.primary + "55" }]} />
                  <Text style={[styles.endTimeText, { color: colors.primary }]}>{entry.endTime}</Text>
                </View>
                <View style={styles.entryBody}>
                  <Text style={[styles.subjectText, { color: colors.foreground }]} numberOfLines={2}>{entry.subject}</Text>
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={2}>{entry.room || "Room not set"} | {entry.teacher || "Faculty not set"}</Text>
                  <View style={styles.tagRow}>
                    {entry.year ? <View style={[styles.tag, { backgroundColor: yColor + "18" }]}><Text style={[styles.tagText, { color: yColor }]}>{entry.year} Year</Text></View> : null}
                    {entry.branch ? <View style={[styles.tag, { backgroundColor: colors.secondary }]}><Text style={[styles.tagText, { color: colors.mutedForeground }]}>{entry.branch}</Text></View> : null}
                    {entry.section ? <View style={[styles.tag, { backgroundColor: colors.secondary }]}><Text style={[styles.tagText, { color: colors.mutedForeground }]}>Sec {entry.section}</Text></View> : null}
                  </View>
                </View>
                <View style={styles.entryActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }]} onPress={() => openEdit(entry)}>
                    <Feather name="edit-2" size={15} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructive + "18" }]} onPress={() => handleDelete(entry)}>
                    <Feather name="trash-2" size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}> 
            <Pressable onPress={() => setShowModal(false)}><Text style={[styles.modalAction, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editEntry ? "Edit Class" : "Add Class"}</Text>
            <Pressable onPress={handleSave} disabled={loading}>{loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.modalAction, { color: colors.primary }]}>Save</Text>}</Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalFields} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Year</Text><DropdownPicker label="Year" value={form.year} options={YEARS} onSelect={selectYear} icon="calendar" placeholder="Select year" /></View>
            <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Department</Text><DropdownPicker label="Department" value={form.branch} options={BRANCHES} onSelect={selectBranch} icon="book" placeholder="Select department" /></View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Subject</Text>
              <DropdownPicker
                label="Subject"
                value={form.subjectCode}
                options={subjectOptions}
                onSelect={selectSubject}
                icon="book-open"
                placeholder={!form.year || !form.branch ? "Select year and department first" : subjectOptions.length === 0 ? "No subjects found" : "Select subject"}
              />
              {form.year && form.branch && subjectOptions.length === 0 ? (
                <Text style={[styles.helperText, { color: colors.warning }]}>Add subjects from Admin &gt; Subjects or run pnpm db:subjects.</Text>
              ) : null}
            </View>
            {[
              { key: "time", label: "Start Time", placeholder: "09:00", icon: "clock" },
              { key: "endTime", label: "End Time", placeholder: "10:00", icon: "clock" },
              { key: "room", label: "Room", placeholder: "CR-201", icon: "map-pin" },
              { key: "teacher", label: "Faculty", placeholder: "Dr. Sharma", icon: "user" },
            ].map(({ key, label, placeholder, icon }) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}> 
                  <Feather name={icon as "book"} size={16} color={colors.mutedForeground} />
                  <TextInput style={[styles.input, { color: colors.foreground }]} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} value={form[key as keyof typeof form]} onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))} />
                </View>
              </View>
            ))}
            <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Section</Text><DropdownPicker label="Section" value={form.section} options={[{ label: "All Sections", value: "All" }, ...SECTIONS]} onSelect={(value) => setForm((current) => ({ ...current, section: value }))} icon="users" placeholder="All sections" /></View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, gap: 14 },
  hero: { borderWidth: 1, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 18 },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notice: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  filterPanel: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  panelTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dayContent: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, minWidth: 62, alignItems: "center" },
  dayChipText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8, maxWidth: "100%", alignSelf: "flex-start" },
  filterChipText: { fontSize: 12, fontFamily: "Inter_700Bold", flexShrink: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  dayLabel: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3 },
  smallAdd: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  emptyState: { borderWidth: 1, borderRadius: 14, padding: 30, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  addFirstBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  entryCard: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderRadius: 14, padding: 14, borderWidth: 1 },
  timeBlock: { width: 70, paddingVertical: 9, borderRadius: 12, alignItems: "center", flexShrink: 0 },
  timeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  timeLine: { width: 1, height: 14, marginVertical: 4 },
  endTimeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  entryBody: { flex: 1, minWidth: 0, gap: 4 },
  subjectText: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 20 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  tagRow: { flexDirection: "row", gap: 5, marginTop: 3, flexWrap: "wrap" },
  tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  tagText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  entryActions: { flexDirection: "column", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalAction: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalFields: { padding: 22, gap: 16 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, minHeight: 48, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  helperText: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
});
