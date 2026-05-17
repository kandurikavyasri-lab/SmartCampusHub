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
import { useAppData, SyllabusItem } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

type Tab = "midmarks" | "results" | "syllabus";

function GradeChip({ grade, colors }: { grade: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const gradeColors: Record<string, string> = { A: "#22C55E", "A-": "#22C55E", "A+": "#22C55E", B: "#3B82F6", "B+": "#3B82F6", C: "#F59E0B", D: "#EF4444", F: "#EF4444" };
  const c = gradeColors[grade] ?? "#6B7280";
  return (
    <View style={[{ backgroundColor: c + "20", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }]}>
      <Text style={{ color: c, fontSize: 13, fontFamily: "Inter_700Bold" }}>{grade}</Text>
    </View>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${pct}%` as "100%", backgroundColor: color }]} />
    </View>
  );
}

export default function AcademicsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getStudentMidMarks, getStudentResults, syllabus } = useAppData();
  const [activeTab, setActiveTab] = useState<Tab>("midmarks");
  const [expandedSyllabus, setExpandedSyllabus] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState(0);

  const midMarks = getStudentMidMarks(user?.id ?? "");
  const results = getStudentResults(user?.id ?? "");
  const semesterResult = results[selectedSemester];

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "midmarks", label: "Mid-term", icon: "bar-chart-2" },
    { key: "results", label: "Results", icon: "award" },
    { key: "syllabus", label: "Syllabus", icon: "book-open" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            style={[
              styles.tab,
              activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(t.key)}
          >
            <Feather
              name={t.icon as "book"}
              size={15}
              color={activeTab === t.key ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === t.key ? colors.primary : colors.mutedForeground },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100, paddingTop: Platform.OS === "web" ? 20 : 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "midmarks" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mid-term Marks</Text>
            {midMarks.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No marks available yet</Text>
              </View>
            ) : (
              midMarks.map((mark) => {
                const total = mark.midTerm1 + mark.midTerm2;
                const max = mark.maxMarks * 2;
                const pct = Math.round((total / max) * 100);
                const barColor = pct >= 80 ? "#22C55E" : pct >= 60 ? "#3B82F6" : "#EF4444";
                return (
                  <View key={mark.id} style={[styles.markCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.markHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subjectName, { color: colors.foreground }]}>{mark.subjectName}</Text>
                        <Text style={[styles.subjectCode, { color: colors.mutedForeground }]}>{mark.subjectCode}</Text>
                      </View>
                      <Text style={[styles.totalScore, { color: barColor }]}>{total}/{max}</Text>
                    </View>
                    <ProgressBar value={total} max={max} color={barColor} />
                    <View style={styles.midtermRow}>
                      <View style={[styles.midtermChip, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.midtermLabel, { color: colors.mutedForeground }]}>Mid 1</Text>
                        <Text style={[styles.midtermValue, { color: colors.foreground }]}>{mark.midTerm1}/{mark.maxMarks}</Text>
                      </View>
                      <View style={[styles.midtermChip, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.midtermLabel, { color: colors.mutedForeground }]}>Mid 2</Text>
                        <Text style={[styles.midtermValue, { color: colors.foreground }]}>{mark.midTerm2}/{mark.maxMarks}</Text>
                      </View>
                      <Text style={[styles.pctText, { color: barColor }]}>{pct}%</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === "results" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Semester Results</Text>
            {results.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results published yet</Text>
              </View>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semesterPicker}>
                  {results.map((r, i) => (
                    <Pressable
                      key={r.id}
                      style={[
                        styles.semChip,
                        i === selectedSemester
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.secondary },
                      ]}
                      onPress={() => setSelectedSemester(i)}
                    >
                      <Text style={[styles.semChipText, { color: i === selectedSemester ? "#fff" : colors.mutedForeground }]}>
                        Sem {r.semester}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {semesterResult && (
                  <>
                    <View style={[styles.gpaCard, { backgroundColor: colors.primary }]}>
                      <View style={styles.gpaMain}>
                        <Text style={styles.gpaLabel}>Semester GPA</Text>
                        <Text style={styles.gpaValue}>{semesterResult.gpa.toFixed(2)}</Text>
                        <GradeChip grade={semesterResult.grade} colors={colors} />
                      </View>
                      <Text style={styles.gpaSubtitle}>Semester {semesterResult.semester} · {semesterResult.subjects.length} subjects</Text>
                    </View>
                    {semesterResult.subjects.map((sub) => (
                      <View key={sub.code} style={[styles.subjectRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.subjectName, { color: colors.foreground }]}>{sub.name}</Text>
                          <Text style={[styles.subjectCode, { color: colors.mutedForeground }]}>{sub.code}</Text>
                        </View>
                        <Text style={[styles.subjectMarks, { color: colors.foreground }]}>{sub.marks}/{sub.maxMarks}</Text>
                        <GradeChip grade={sub.grade} colors={colors} />
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {activeTab === "syllabus" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Syllabus</Text>
            {syllabus.map((item: SyllabusItem) => (
              <Pressable
                key={item.id}
                style={[styles.syllabusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setExpandedSyllabus(expandedSyllabus === item.id ? null : item.id)}
              >
                <View style={styles.syllabusHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subjectName, { color: colors.foreground }]}>{item.subjectName}</Text>
                    <Text style={[styles.subjectCode, { color: colors.mutedForeground }]}>
                      {item.subjectCode} · {item.credits} credits
                    </Text>
                  </View>
                  <Feather
                    name={expandedSyllabus === item.id ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </View>
                {expandedSyllabus === item.id && (
                  <View style={styles.syllabusBody}>
                    <Text style={[styles.syllabusDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                    <Text style={[styles.topicsTitle, { color: colors.foreground }]}>Topics covered:</Text>
                    {item.topics.map((topic, i) => (
                      <View key={i} style={styles.topicRow}>
                        <View style={[styles.topicBullet, { backgroundColor: colors.accent }]} />
                        <Text style={[styles.topicText, { color: colors.foreground }]}>{topic}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row", borderBottomWidth: 1,
    paddingTop: Platform.OS === "web" ? 8 : 0,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 20 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  markCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  markHeader: { flexDirection: "row", alignItems: "flex-start" },
  subjectName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  subjectCode: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  totalScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
  progressBg: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  midtermRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  midtermChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: "row", gap: 4, alignItems: "center" },
  midtermLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  midtermValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pctText: { fontSize: 14, fontFamily: "Inter_700Bold", marginLeft: "auto" },
  semesterPicker: { gap: 8, marginBottom: 4, flexDirection: "row" },
  semChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  semChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  gpaCard: {
    borderRadius: 20, padding: 20, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  gpaMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  gpaLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  gpaValue: { color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold" },
  gpaSubtitle: { color: "rgba(255,255,255,0.65)", fontSize: 13, fontFamily: "Inter_400Regular" },
  subjectRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  subjectMarks: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  syllabusCard: {
    borderRadius: 16, padding: 16, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  syllabusHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  syllabusBody: { marginTop: 12, gap: 8 },
  syllabusDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  topicsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  topicRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  topicBullet: { width: 5, height: 5, borderRadius: 3 },
  topicText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
