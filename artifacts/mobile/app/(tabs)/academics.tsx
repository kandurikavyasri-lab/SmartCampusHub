import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
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

import { useAuth } from "@/context/AuthContext";
import { useAppData, SyllabusItem } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

type Tab = "midmarks" | "results" | "syllabus" | "gpacalc";

// 10-point GPA scale (Indian university standard)
const GRADE_POINTS: { grade: string; points: number; range: string; color: string }[] = [
  { grade: "O",  points: 10, range: "90–100", color: "#22C55E" },
  { grade: "A+", points: 9,  range: "80–89",  color: "#16A34A" },
  { grade: "A",  points: 8,  range: "70–79",  color: "#3B82F6" },
  { grade: "B+", points: 7,  range: "60–69",  color: "#6366F1" },
  { grade: "B",  points: 6,  range: "55–59",  color: "#F59E0B" },
  { grade: "C",  points: 5,  range: "50–54",  color: "#F97316" },
  { grade: "F",  points: 0,  range: "< 50",   color: "#EF4444" },
];

function gradeColor(points: number) {
  if (points >= 9) return "#22C55E";
  if (points >= 8) return "#3B82F6";
  if (points >= 7) return "#6366F1";
  if (points >= 6) return "#F59E0B";
  if (points >= 5) return "#F97316";
  return "#EF4444";
}

function cgpaLabel(cgpa: number) {
  if (cgpa >= 9) return "Outstanding";
  if (cgpa >= 8) return "Excellent";
  if (cgpa >= 7) return "Very Good";
  if (cgpa >= 6) return "Good";
  if (cgpa >= 5) return "Average";
  return "Below Average";
}

interface CalcSubject {
  id: string;
  name: string;
  code: string;
  credits: number;
  gradePoints: number | null;
}

function GradeChip({ grade, colors }: { grade: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const map: Record<string, string> = { A: "#22C55E", "A-": "#22C55E", "A+": "#22C55E", O: "#22C55E", B: "#3B82F6", "B+": "#6366F1", C: "#F59E0B", D: "#EF4444", F: "#EF4444" };
  const c = map[grade] ?? "#6B7280";
  return (
    <View style={{ backgroundColor: c + "20", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
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

// ─── GPA Calculator Tab ────────────────────────────────────────────────────
function GPACalculator({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const { getStudentSyllabus } = useAppData();
  const { user: gpuUser } = useAuth();
  const filteredSyllabus = getStudentSyllabus(gpuUser?.year ?? "", gpuUser?.branch ?? "");
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState<CalcSubject[]>(() =>
    filteredSyllabus.map((s) => ({
      id: s.id,
      name: s.subjectName,
      code: s.subjectCode,
      credits: s.credits,
      gradePoints: null,
    }))
  );
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCredits, setNewCredits] = useState("3");
  const [showScaleModal, setShowScaleModal] = useState(false);

  const assigned = subjects.filter((s) => s.gradePoints !== null);
  const totalCredits = assigned.reduce((sum, s) => sum + s.credits, 0);
  const weightedSum = assigned.reduce((sum, s) => sum + s.credits * (s.gradePoints ?? 0), 0);
  const cgpa = totalCredits > 0 ? weightedSum / totalCredits : 0;

  const openGradePicker = (id: string) => {
    setActiveSubjectId(id);
    setShowGradeModal(true);
  };

  const setGrade = (points: number) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === activeSubjectId ? { ...s, gradePoints: points } : s))
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGradeModal(false);
  };

  const clearGrade = (id: string) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, gradePoints: null } : s)));
  };

  const addSubject = () => {
    if (!newName.trim()) return;
    const c = parseInt(newCredits);
    setSubjects((prev) => [
      ...prev,
      { id: "custom-" + Date.now(), name: newName.trim(), code: newCode.trim() || "—", credits: isNaN(c) ? 3 : c, gradePoints: null },
    ]);
    setNewName(""); setNewCode(""); setNewCredits("3");
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetAll = () => {
    setSubjects((prev) => prev.map((s) => ({ ...s, gradePoints: null })));
  };

  const cgpaColor = gradeColor(cgpa);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.calcScroll,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* CGPA Result Card */}
        <View style={[styles.cgpaCard, { backgroundColor: colors.primary }]}>
          <View style={styles.cgpaTop}>
            <View>
              <Text style={styles.cgpaHeading}>Your CGPA</Text>
              <Text style={styles.cgpaScale}>10-point scale</Text>
            </View>
            <TouchableOpacity
              style={[styles.scaleBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}
              onPress={() => setShowScaleModal(true)}
            >
              <Feather name="info" size={14} color="#fff" />
              <Text style={styles.scaleBtnText}>Grade Scale</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cgpaValueRow}>
            <Text style={[styles.cgpaValue, { color: totalCredits === 0 ? "rgba(255,255,255,0.3)" : "#fff" }]}>
              {totalCredits === 0 ? "—" : cgpa.toFixed(2)}
            </Text>
            <Text style={styles.cgpaMax}>/10</Text>
          </View>

          {totalCredits > 0 && (
            <>
              <View style={styles.cgpaBarBg}>
                <View style={[styles.cgpaBarFill, { width: `${(cgpa / 10) * 100}%` as "100%", backgroundColor: cgpaColor }]} />
              </View>
              <View style={styles.cgpaFooter}>
                <Text style={[styles.cgpaLabel, { color: cgpaColor }]}>{cgpaLabel(cgpa)}</Text>
                <Text style={styles.cgpaCredits}>{assigned.length}/{subjects.length} subjects · {totalCredits} credits</Text>
              </View>
            </>
          )}
          {totalCredits === 0 && (
            <Text style={styles.cgpaHint}>Assign grades to subjects below to calculate your CGPA</Text>
          )}
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <Text style={[styles.subjectsTitle, { color: colors.foreground }]}>Subjects</Text>
          <View style={styles.actionBtns}>
            {assigned.length > 0 && (
              <TouchableOpacity
                style={[styles.miniBtn, { backgroundColor: colors.destructive + "18" }]}
                onPress={resetAll}
              >
                <Feather name="refresh-ccw" size={13} color={colors.destructive} />
                <Text style={[styles.miniBtnText, { color: colors.destructive }]}>Reset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.miniBtn, { backgroundColor: colors.primary + "18" }]}
              onPress={() => setShowAddModal(true)}
            >
              <Feather name="plus" size={13} color={colors.primary} />
              <Text style={[styles.miniBtnText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Subject list */}
        {subjects.map((subject) => {
          const gp = subject.gradePoints;
          const gradeInfo = GRADE_POINTS.find((g) => g.points === gp);
          const barColor = gp !== null ? gradeColor(gp) : colors.border;
          return (
            <View key={subject.id} style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.subjectCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectCardName, { color: colors.foreground }]}>{subject.name}</Text>
                  <Text style={[styles.subjectCardMeta, { color: colors.mutedForeground }]}>
                    {subject.code} · {subject.credits} credits
                  </Text>
                </View>
                <View style={styles.subjectCardRight}>
                  {gp !== null ? (
                    <View style={styles.gradeRow}>
                      <View style={[styles.gpBadge, { backgroundColor: barColor + "20" }]}>
                        <Text style={[styles.gpBadgeGrade, { color: barColor }]}>{gradeInfo?.grade ?? "—"}</Text>
                        <Text style={[styles.gpBadgePoints, { color: barColor }]}>{gp}</Text>
                      </View>
                      <TouchableOpacity onPress={() => clearGrade(subject.id)} style={styles.clearBtn}>
                        <Feather name="x" size={12} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.pickGradeBtn, { backgroundColor: colors.primary }]}
                      onPress={() => openGradePicker(subject.id)}
                    >
                      <Text style={styles.pickGradeBtnText}>Pick Grade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {gp !== null && (
                <View style={styles.subjectBarRow}>
                  <View style={[styles.subjectBar, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.subjectBarFill, { width: `${(gp / 10) * 100}%` as "100%", backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.gpText, { color: barColor }]}>{gp}/10</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Grade Picker Modal */}
      <Modal visible={showGradeModal} transparent animationType="slide" onRequestClose={() => setShowGradeModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowGradeModal(false)}>
          <View style={[styles.gradeSheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Grade</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
              {subjects.find((s) => s.id === activeSubjectId)?.name}
            </Text>
            <View style={styles.gradeGrid}>
              {GRADE_POINTS.map((g) => (
                <TouchableOpacity
                  key={g.grade}
                  style={[styles.gradeOption, { backgroundColor: g.color + "18", borderColor: g.color + "40" }]}
                  onPress={() => setGrade(g.points)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.gradeOptionLabel, { color: g.color }]}>{g.grade}</Text>
                  <Text style={[styles.gradeOptionPoints, { color: g.color }]}>{g.points} pts</Text>
                  <Text style={[styles.gradeOptionRange, { color: g.color + "AA" }]}>{g.range}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Add Subject Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowAddModal(false)}>
          <View style={[styles.addSheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add Subject</Text>
            {[
              { label: "Subject Name *", value: newName, setter: setNewName, placeholder: "e.g. Digital Design", icon: "book" },
              { label: "Subject Code", value: newCode, setter: setNewCode, placeholder: "e.g. EC401", icon: "hash" },
              { label: "Credits *", value: newCredits, setter: setNewCredits, placeholder: "e.g. 3", icon: "star", numeric: true },
            ].map(({ label, value, setter, placeholder, icon, numeric }) => (
              <View key={label} style={styles.addField}>
                <Text style={[styles.addFieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <View style={[styles.addFieldInput, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Feather name={icon as "book"} size={15} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.addInput, { color: colors.foreground }]}
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={numeric ? "numeric" : "default"}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addSubjectBtn, { backgroundColor: colors.primary, opacity: newName.trim() ? 1 : 0.5 }]}
              onPress={addSubject}
              disabled={!newName.trim()}
            >
              <Text style={styles.addSubjectBtnText}>Add Subject</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Grade Scale Modal */}
      <Modal visible={showScaleModal} transparent animationType="fade" onRequestClose={() => setShowScaleModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowScaleModal(false)}>
          <View style={[styles.scaleSheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>10-Point Grade Scale</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>CGPA = Σ(Grade Points × Credits) / Σ(Credits)</Text>
            {GRADE_POINTS.map((g) => (
              <View key={g.grade} style={[styles.scaleRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.scaleGradeBadge, { backgroundColor: g.color + "18" }]}>
                  <Text style={[styles.scaleGrade, { color: g.color }]}>{g.grade}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scaleRange, { color: colors.foreground }]}>{g.range}%</Text>
                </View>
                <Text style={[styles.scalePoints, { color: g.color }]}>{g.points} pts</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AcademicsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getStudentMidMarks, getStudentResults, getStudentSyllabus: getSyllabus } = useAppData();
  const syllabus = getSyllabus(user?.year ?? "", user?.branch ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("midmarks");
  const [expandedSyllabus, setExpandedSyllabus] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState(0);

  const midMarks = getStudentMidMarks(user?.id ?? "");
  const results = getStudentResults(user?.id ?? "");
  const semesterResult = results[selectedSemester];

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "midmarks",  label: "Mid-term",  icon: "bar-chart-2"  },
    { key: "results",   label: "Results",   icon: "award"        },
    { key: "syllabus",  label: "Syllabus",  icon: "book-open"    },
    { key: "gpacalc",   label: "GPA Calc",  icon: "percent"      },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
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
                size={14}
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
        </ScrollView>
      </View>

      {/* GPA Calc renders its own scroll */}
      {activeTab === "gpacalc" ? (
        <GPACalculator colors={colors} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 100, paddingTop: Platform.OS === "web" ? 20 : 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Mid-term marks */}
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

          {/* Semester results */}
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
                          i === selectedSemester ? { backgroundColor: colors.primary } : { backgroundColor: colors.secondary },
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

          {/* Syllabus */}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "web" ? 8 : 0,
  },
  tabBarContent: { paddingHorizontal: 4 },
  tab: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingHorizontal: 16, paddingVertical: 13,
  },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 20 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },

  // GPA Calc
  calcScroll: { paddingHorizontal: 20, paddingTop: Platform.OS === "web" ? 20 : 16 },
  cgpaCard: {
    borderRadius: 24, padding: 22, gap: 14, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  cgpaTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cgpaHeading: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontFamily: "Inter_400Regular" },
  cgpaScale: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  scaleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  scaleBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
  cgpaValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  cgpaValue: { fontSize: 52, fontFamily: "Inter_700Bold", lineHeight: 56 },
  cgpaMax: { color: "rgba(255,255,255,0.5)", fontSize: 22, fontFamily: "Inter_400Regular", marginBottom: 6 },
  cgpaBarBg: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" },
  cgpaBarFill: { height: "100%", borderRadius: 4 },
  cgpaFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cgpaLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cgpaCredits: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "Inter_400Regular" },
  cgpaHint: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 12 },
  subjectsTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  actionBtns: { flexDirection: "row", gap: 8 },
  miniBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  miniBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  subjectCard: {
    borderRadius: 16, padding: 14, borderWidth: 1, gap: 10,
    marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  subjectCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  subjectCardName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subjectCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  subjectCardRight: { alignItems: "flex-end" },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  gpBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, flexDirection: "row", gap: 5, alignItems: "center" },
  gpBadgeGrade: { fontSize: 13, fontFamily: "Inter_700Bold" },
  gpBadgePoints: { fontSize: 12, fontFamily: "Inter_500Medium" },
  clearBtn: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  pickGradeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  pickGradeBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  subjectBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  subjectBar: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  subjectBarFill: { height: "100%", borderRadius: 3 },
  gpText: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 30, textAlign: "right" },

  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  gradeSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 6,
  },
  addSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 14,
  },
  scaleSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 4,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  sheetSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  gradeOption: {
    width: "30%", borderRadius: 14, padding: 12, alignItems: "center", gap: 2,
    borderWidth: 1,
  },
  gradeOptionLabel: { fontSize: 18, fontFamily: "Inter_700Bold" },
  gradeOptionPoints: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  gradeOptionRange: { fontSize: 10, fontFamily: "Inter_400Regular" },
  addField: { gap: 6 },
  addFieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addFieldInput: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  addInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  addSubjectBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 4 },
  addSubjectBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scaleRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  scaleGradeBadge: { width: 40, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  scaleGrade: { fontSize: 13, fontFamily: "Inter_700Bold" },
  scaleRange: { fontSize: 14, fontFamily: "Inter_400Regular" },
  scalePoints: { fontSize: 14, fontFamily: "Inter_700Bold" },

  // Shared
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
