import { Feather } from "@expo/vector-icons";
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SUBJECT_COLORS = ["#2563EB", "#059669", "#7C3AED", "#DB2777", "#0891B2", "#EA580C", "#4F46E5"];

function getSubjectColor(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash += code.charCodeAt(i);
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

export default function TimetableScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getStudentTimetable } = useAppData();
  const todayIdx = new Date().getDay() === 0 ? 5 : Math.min(new Date().getDay() - 1, 5);
  const [selectedDay, setSelectedDay] = useState(todayIdx);

  const allClasses = getStudentTimetable(
    user?.year ?? "",
    user?.branch ?? "",
    user?.section ?? ""
  );
  const classes = allClasses
    .filter((t) => t.day === DAYS[selectedDay])
    .sort((a, b) => a.time.localeCompare(b.time));
  const selectedFilter = [user?.year ? user.year + " Yr" : "Year", user?.branch || "Department", user?.section ? "Sec " + user.section : "Section"].join(" - ");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 104, paddingTop: Platform.OS === "web" ? 22 : 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="calendar" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>Academic Timetable</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Schedule</Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}> 
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>{DAYS[selectedDay]}</Text>
              <Text style={styles.summarySubtitle}>
                {classes.length === 0 ? "No classes scheduled" : classes.length + " class" + (classes.length > 1 ? "es" : "") + " scheduled"}
                {selectedDay === todayIdx ? " today" : ""}
              </Text>
            </View>
            <View style={styles.summaryIconBox}>
              <Feather name={classes.length === 0 ? "coffee" : "clock"} size={26} color="#fff" />
            </View>
          </View>
        </View>

        <View style={[styles.filterPanel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.filterPanelHeader}>
            <View>
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>Schedule Filters</Text>
              <Text style={[styles.panelSubtitle, { color: colors.mutedForeground }]}>{selectedFilter}</Text>
            </View>
            <View style={[styles.filterBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="filter" size={13} color={colors.primary} />
            </View>
          </View>
          <View style={styles.dayGrid}>
            {SHORT_DAYS.map((day, index) => {
              const isToday = index === todayIdx;
              const isSelected = index === selectedDay;
              const classCount = allClasses.filter((entry) => entry.day === DAYS[index]).length;
              return (
                <Pressable
                  key={day}
                  style={({ pressed }) => [
                    styles.dayChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.secondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                  onPress={() => setSelectedDay(index)}
                >
                  <View style={styles.dayChipTopRow}>
                    <Text style={[styles.dayChipText, { color: isSelected ? "#fff" : colors.foreground }]}>{day}</Text>
                    {isToday && <View style={[styles.todayDot, { backgroundColor: isSelected ? "rgba(255,255,255,0.75)" : colors.accent }]} />}
                  </View>
                  <Text style={[styles.dayChipMeta, { color: isSelected ? "rgba(255,255,255,0.82)" : colors.mutedForeground }]}> 
                    {classCount} {classCount === 1 ? "class" : "classes"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.dayLabel, { color: colors.foreground }]}>{DAYS[selectedDay]}</Text>
            <Text style={[styles.daySubtext, { color: colors.mutedForeground }]}>
              {selectedDay === todayIdx ? "Today" : "Selected day"} - {selectedFilter}
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}> 
            <Text style={[styles.countText, { color: colors.foreground }]}>{classes.length}</Text>
          </View>
        </View>

        {classes.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}> 
              <Feather name="coffee" size={34} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No classes</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>You have a free day on {DAYS[selectedDay]}.</Text>
          </View>
        ) : (
          <View style={styles.classList}>
            {classes.map((cls, index) => {
              const subColor = getSubjectColor(cls.subjectCode || cls.subject);
              return (
                <View key={cls.id} style={styles.classRow}>
                  <View style={styles.timeline}>
                    <View style={[styles.timeNode, { backgroundColor: subColor }]} />
                    {index < classes.length - 1 && <View style={[styles.timeLine, { backgroundColor: colors.border }]} />}
                  </View>
                  <View style={[styles.classCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                    <View style={styles.cardTopRow}>
                      <View style={[styles.subjectCodePill, { backgroundColor: subColor + "20" }]}> 
                        <Text style={[styles.subjectCodeText, { color: subColor }]}>{cls.subjectCode || "SUB"}</Text>
                      </View>
                      <View style={[styles.timeBadge, { backgroundColor: colors.secondary }]}> 
                        <Feather name="clock" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.timeBadgeText, { color: colors.mutedForeground }]}>{cls.time} - {cls.endTime}</Text>
                      </View>
                    </View>
                    <Text style={[styles.subjectName, { color: colors.foreground }]}>{cls.subject}</Text>
                    <View style={styles.cardMetaGrid}>
                      <View style={styles.metaItem}>
                        <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{cls.room || "Room not set"}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Feather name="user" size={14} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{cls.teacher || "Faculty not set"}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 16 },
  headerBlock: { gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerTextBlock: { flex: 1 },
  eyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 2 },
  summaryCard: { borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  summaryCopy: { flex: 1, gap: 5 },
  summaryTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  summarySubtitle: { color: "rgba(255,255,255,0.84)", fontSize: 14, fontFamily: "Inter_500Medium" },
  summaryIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  filterPanel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 13 },
  filterPanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  panelTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  panelSubtitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3 },
  filterBadge: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: { width: "31.5%", minHeight: 62, borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 10, justifyContent: "space-between" },
  dayChipTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  dayChipText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dayChipMeta: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  todayDot: { width: 6, height: 6, borderRadius: 3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 2 },
  dayLabel: { fontSize: 22, fontFamily: "Inter_700Bold" },
  daySubtext: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3 },
  countBadge: { minWidth: 42, height: 34, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  countText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyState: { borderWidth: 1, borderRadius: 18, alignItems: "center", paddingVertical: 48, paddingHorizontal: 20, gap: 12 },
  emptyIcon: { width: 70, height: 70, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  classList: { gap: 0 },
  classRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  timeline: { width: 18, alignItems: "center" },
  timeNode: { width: 12, height: 12, borderRadius: 6, marginTop: 20 },
  timeLine: { flex: 1, width: 2, marginTop: 6, borderRadius: 1 },
  classCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  subjectCodePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, maxWidth: "45%" },
  subjectCodeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  timeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, flexShrink: 1 },
  timeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  subjectName: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 23 },
  cardMetaGrid: { gap: 7 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontSize: 13, fontFamily: "Inter_500Medium", flexShrink: 1 },
});
