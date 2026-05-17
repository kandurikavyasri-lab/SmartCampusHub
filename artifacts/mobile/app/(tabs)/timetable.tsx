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
const SUBJECT_COLORS = ["#6366F1", "#F59E0B", "#22C55E", "#EC4899", "#3B82F6", "#EF4444", "#8B5CF6"];

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.daySelector, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorContent}>
          {SHORT_DAYS.map((d, i) => {
            const isToday = i === todayIdx;
            const isSelected = i === selectedDay;
            return (
              <Pressable
                key={d}
                style={({ pressed }) => [
                  styles.dayChip,
                  isSelected && { backgroundColor: colors.primary },
                  !isSelected && { backgroundColor: colors.secondary },
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.dayChipText, { color: isSelected ? "#fff" : colors.mutedForeground }]}>{d}</Text>
                {isToday && (
                  <View style={[styles.todayDot, { backgroundColor: isSelected ? "rgba(255,255,255,0.6)" : colors.accent }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100, paddingTop: Platform.OS === "web" ? 20 : 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dayHeader}>
          <Text style={[styles.dayLabel, { color: colors.foreground }]}>
            {DAYS[selectedDay]}
            {selectedDay === todayIdx && <Text style={{ color: colors.accent }}> · Today</Text>}
          </Text>
          {user?.year && user?.branch && (
            <View style={[styles.filterBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="filter" size={11} color={colors.mutedForeground} />
              <Text style={[styles.filterText, { color: colors.mutedForeground }]}>
                {user.year} Yr · {user.branch} · Sec {user.section}
              </Text>
            </View>
          )}
        </View>

        {classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="coffee" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No classes</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              You have a free day on {DAYS[selectedDay]}
            </Text>
          </View>
        ) : (
          <View style={styles.classList}>
            {classes.map((cls) => {
              const subColor = getSubjectColor(cls.subjectCode);
              return (
                <View key={cls.id} style={styles.classRow}>
                  <View style={styles.timeline}>
                    <Text style={[styles.timeText, { color: colors.primary }]}>{cls.time}</Text>
                    <View style={[styles.timeLine, { backgroundColor: colors.border }]} />
                  </View>
                  <View style={[styles.classCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: subColor }]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.subjectDot, { backgroundColor: subColor + "22" }]}>
                        <Text style={[styles.subjectCodeText, { color: subColor }]}>{cls.subjectCode}</Text>
                      </View>
                      <Text style={[styles.endTime, { color: colors.mutedForeground }]}>{cls.time} – {cls.endTime}</Text>
                    </View>
                    <Text style={[styles.subjectName, { color: colors.foreground }]}>{cls.subject}</Text>
                    <View style={styles.cardFooter}>
                      <View style={styles.metaItem}>
                        <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{cls.room}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Feather name="user" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{cls.teacher}</Text>
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
  daySelector: { borderBottomWidth: 1, paddingTop: Platform.OS === "web" ? 8 : 0 },
  daySelectorContent: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 4 },
  dayChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  todayDot: { width: 5, height: 5, borderRadius: 3 },
  scroll: { paddingHorizontal: 20 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  dayLabel: { fontSize: 22, fontFamily: "Inter_700Bold" },
  filterBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  filterText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  classList: { gap: 0 },
  classRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  timeline: { width: 52, alignItems: "center", gap: 6 },
  timeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  timeLine: { flex: 1, width: 2, borderRadius: 1 },
  classCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, gap: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subjectDot: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subjectCodeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  endTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subjectName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardFooter: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
