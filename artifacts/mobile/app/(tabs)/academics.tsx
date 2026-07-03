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
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";

type Tab = "midmarks" | "results" | "syllabus" | "gpacalc";

// ─── Indian 10-point grading scale ───────────────────────────────────────────

const GRADE_POINTS: { grade: string; points: number; range: string; color: string; label: string }[] = [
  { grade: "O",  points: 10, range: "≥ 90",  color: "#22C55E", label: "Outstanding"   },
  { grade: "A+", points: 9,  range: "80–89",  color: "#16A34A", label: "Excellent"     },
  { grade: "A",  points: 8,  range: "70–79",  color: "#3B82F6", label: "Very Good"     },
  { grade: "B+", points: 7,  range: "60–69",  color: "#6366F1", label: "Good"          },
  { grade: "B",  points: 6,  range: "55–59",  color: "#F59E0B", label: "Above Average" },
  { grade: "C",  points: 5,  range: "50–54",  color: "#F97316", label: "Average"       },
  { grade: "P",  points: 4,  range: "40–49",  color: "#94A3B8", label: "Pass"          },
  { grade: "F",  points: 0,  range: "< 40",   color: "#EF4444", label: "Fail"          },
];

function gpToGrade(gp: number): string {
  if (gp >= 10) return "O";
  if (gp >= 9)  return "A+";
  if (gp >= 8)  return "A";
  if (gp >= 7)  return "B+";
  if (gp >= 6)  return "B";
  if (gp >= 5)  return "C";
  if (gp >= 4)  return "P";
  return "F";
}

function gradeColor(gp: number) {
  const g = GRADE_POINTS.find((x) => x.points <= gp && (gp < x.points + 1 || x.points === 10));
  return g?.color ?? "#EF4444";
}

function sgpaLabel(sgpa: number) {
  if (sgpa >= 9.5) return "Outstanding";
  if (sgpa >= 9)   return "Excellent";
  if (sgpa >= 8)   return "Very Good";
  if (sgpa >= 7)   return "Good";
  if (sgpa >= 6)   return "Above Average";
  if (sgpa >= 5)   return "Average";
  if (sgpa >= 4)   return "Pass";
  return "Below Pass";
}

function GradeChip({ grade, colors }: { grade: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const map: Record<string, string> = { O: "#22C55E", "A+": "#16A34A", A: "#3B82F6", "B+": "#6366F1", B: "#F59E0B", C: "#F97316", P: "#94A3B8", F: "#EF4444" };
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

// ─── GPA / SGPA Calculator ────────────────────────────────────────────────────

interface CalcSubject { id: string; name: string; code: string; credits: number; gradePoints: number | null }

function SGPACalculator({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const { getStudentSyllabus } = useAppData();
  const { user } = useAuth();
  const filteredSyllabus = getStudentSyllabus(user?.year ?? "", user?.branch ?? "");
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState<CalcSubject[]>(() =>
    filteredSyllabus.map((s) => ({ id: s.id, name: s.subjectName, code: s.subjectCode, credits: s.credits, gradePoints: null }))
  );
  const [showGradeModal,  setShowGradeModal]  = useState(false);
  const [activeId,        setActiveId]        = useState<string | null>(null);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showScaleModal,  setShowScaleModal]  = useState(false);
  const [newName,         setNewName]         = useState("");
  const [newCode,         setNewCode]         = useState("");
  const [newCredits,      setNewCredits]      = useState("3");

  const assigned     = subjects.filter((s) => s.gradePoints !== null);
  const totalCredits = assigned.reduce((s, x) => s + x.credits, 0);
  const weightedSum  = assigned.reduce((s, x) => s + x.credits * (x.gradePoints ?? 0), 0);
  const sgpa         = totalCredits > 0 ? weightedSum / totalCredits : 0;
  const sgpaColor    = totalCredits > 0 ? gradeColor(sgpa) : "rgba(255,255,255,0.4)";

  const openPicker = (id: string) => { setActiveId(id); setShowGradeModal(true); };
  const setGrade   = (pts: number) => {
    setSubjects((p) => p.map((s) => (s.id === activeId ? { ...s, gradePoints: pts } : s)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGradeModal(false);
  };
  const clearGrade = (id: string) => setSubjects((p) => p.map((s) => (s.id === id ? { ...s, gradePoints: null } : s)));
  const addSubject = () => {
    if (!newName.trim()) return;
    const c = parseInt(newCredits);
    setSubjects((p) => [...p, { id: "c-" + Date.now(), name: newName.trim(), code: newCode.trim() || "—", credits: isNaN(c) ? 3 : c, gradePoints: null }]);
    setNewName(""); setNewCode(""); setNewCredits("3");
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const resetAll = () => setSubjects((p) => p.map((s) => ({ ...s, gradePoints: null })));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.calcScroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>

        {/* SGPA Result Card */}
        <View style={[styles.cgpaCard, { backgroundColor: colors.primary }]}>
          <View style={styles.cgpaTop}>
            <View>
              <Text style={styles.cgpaHeading}>SGPA (This Semester)</Text>
              <Text style={styles.cgpaScale}>10-point grading scale</Text>
            </View>
            <TouchableOpacity style={[styles.scaleBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]} onPress={() => setShowScaleModal(true)}>
              <Feather name="info" size={14} color="#fff" />
              <Text style={styles.scaleBtnText}>Grade Scale</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cgpaValueRow}>
            <Text style={[styles.cgpaValue, { color: totalCredits === 0 ? "rgba(255,255,255,0.3)" : "#fff" }]}>
              {totalCredits === 0 ? "—" : sgpa.toFixed(2)}
            </Text>
            <Text style={styles.cgpaMax}>/10</Text>
          </View>
          {totalCredits > 0 && (
            <>
              <View style={styles.cgpaBarBg}>
                <View style={[styles.cgpaBarFill, { width: `${(sgpa / 10) * 100}%` as "100%", backgroundColor: sgpaColor }]} />
              </View>
              <View style={styles.cgpaFooter}>
                <Text style={[styles.cgpaLabel, { color: sgpaColor }]}>{sgpaLabel(sgpa)} · {gpToGrade(sgpa)}</Text>
                <Text style={styles.cgpaCredits}>{assigned.length}/{subjects.length} subjects · {totalCredits} credits</Text>
              </View>
            </>
          )}
          {totalCredits === 0 && (
            <Text style={styles.cgpaHint}>Assign grades to subjects below to calculate your SGPA</Text>
          )}
        </View>

        {/* CGPA note */}
        <View style={[styles.cgpaNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.cgpaNoteText, { color: colors.mutedForeground }]}>
            CGPA is the cumulative average across all semesters. View it in the Results tab.
          </Text>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <Text style={[styles.subjectsTitle, { color: colors.foreground }]}>Subjects & Credits</Text>
          <View style={styles.actionBtns}>
            {assigned.length > 0 && (
              <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.destructive + "18" }]} onPress={resetAll}>
                <Feather name="refresh-ccw" size={13} color={colors.destructive} />
                <Text style={[styles.miniBtnText, { color: colors.destructive }]}>Reset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.miniBtn, { backgroundColor: colors.primary + "18" }]} onPress={() => setShowAddModal(true)}>
              <Feather name="plus" size={13} color={colors.primary} />
              <Text style={[styles.miniBtnText, { color: colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {subjects.map((subject) => {
          const gp = subject.gradePoints;
          const gradeInfo = GRADE_POINTS.find((g) => g.points === gp);
          const barColor  = gp !== null ? gradeColor(gp) : colors.border;
          return (
            <View key={subject.id} style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.subjectCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectCardName, { color: colors.foreground }]}>{subject.name}</Text>
                  <Text style={[styles.subjectCardMeta, { color: colors.mutedForeground }]}>
                    {subject.code}  ·  {subject.credits} Credits
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
                    <TouchableOpacity style={[styles.pickGradeBtn, { backgroundColor: colors.primary }]} onPress={() => openPicker(subject.id)}>
                      <Text style={styles.pickGradeBtnText}>Set Grade</Text>
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
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Select Grade</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>
              {subjects.find((s) => s.id === activeId)?.name}
            </Text>
            <View style={styles.gradeGrid}>
              {GRADE_POINTS.map((g) => (
                <TouchableOpacity key={g.grade} style={[styles.gradeOption, { backgroundColor: g.color + "18", borderColor: g.color + "40" }]} onPress={() => setGrade(g.points)} activeOpacity={0.75}>
                  <Text style={[styles.gradeOptionLabel, { color: g.color }]}>{g.grade}</Text>
                  <Text style={[styles.gradeOptionPoints, { color: g.color }]}>{g.points} pts</Text>
                  <Text style={[styles.gradeOptionRange, { color: g.color + "AA" }]}>{g.range}%</Text>
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
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add Subject</Text>
            {[
              { label: "Subject Name *", value: newName,    setter: setNewName,    placeholder: "e.g. Digital Signal Processing", icon: "book"   },
              { label: "Subject Code",   value: newCode,    setter: setNewCode,    placeholder: "e.g. EC501",                      icon: "hash"   },
              { label: "Credits *",      value: newCredits, setter: setNewCredits, placeholder: "e.g. 4",                          icon: "star",  numeric: true },
            ].map(({ label, value, setter, placeholder, icon, numeric }) => (
              <View key={label} style={styles.addField}>
                <Text style={[styles.addFieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <View style={[styles.addFieldInput, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <Feather name={icon as "book"} size={15} color={colors.mutedForeground} />
                  <TextInput style={[styles.addInput, { color: colors.foreground }]} value={value} onChangeText={setter} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={numeric ? "numeric" : "default"} />
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.addSubjectBtn, { backgroundColor: colors.primary, opacity: newName.trim() ? 1 : 0.5 }]} onPress={addSubject} disabled={!newName.trim()}>
              <Text style={styles.addSubjectBtnText}>Add Subject</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Grade Scale Modal */}
      <Modal visible={showScaleModal} transparent animationType="fade" onRequestClose={() => setShowScaleModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowScaleModal(false)}>
          <View style={[styles.scaleSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Indian 10-Point Grade Scale</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}>SGPA = Σ(Grade Points × Credits) ÷ Σ(Credits)</Text>
            {GRADE_POINTS.map((g) => (
              <View key={g.grade} style={[styles.scaleRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.scaleGradeBadge, { backgroundColor: g.color + "18" }]}>
                  <Text style={[styles.scaleGrade, { color: g.color }]}>{g.grade}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scaleRange, { color: colors.foreground }]}>{g.range}%</Text>
                  <Text style={[styles.scaleRangeLabel, { color: colors.mutedForeground }]}>{g.label}</Text>
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

// ─── Main Academics Screen ────────────────────────────────────────────────────

export default function AcademicsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getStudentMidMarks, getStudentResults, getStudentSyllabus: getSyllabus } = useAppData();
  const syllabus = getSyllabus(user?.year ?? "", user?.branch ?? "");
  const [activeTab,       setActiveTab]       = useState<Tab>("midmarks");
  const [expandedSyllabus, setExpandedSyllabus] = useState<string | null>(null);
  const [selectedSemIdx,   setSelectedSemIdx]  = useState(0);

  const midMarks = getStudentMidMarks(user?.id ?? "");
  const results  = getStudentResults(user?.id ?? "");
  const semResult = results[selectedSemIdx];

  // CGPA = average of all SGPAs (weighted by credits if available)
  const cgpa = results.length > 0
    ? results.reduce((s, r) => s + (r.sgpa ?? r.gpa ?? 0), 0) / results.length
    : 0;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "midmarks", label: "Mid Marks", icon: "bar-chart-2" },
    { key: "results",  label: "Results",   icon: "award"       },
    { key: "syllabus", label: "Syllabus",  icon: "book-open"   },
    { key: "gpacalc",  label: "SGPA Calc", icon: "percent"     },
  ];
  const academicProfile = [user?.year ? user.year + " Year" : "Year not set", user?.branch || "Department not set", user?.section ? "Sec " + user.section : "Section not set"].join(" - ");
  const resultScore = results.length > 0 ? cgpa.toFixed(2) : "--";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.pageScroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.academicHeader}>
        <View style={styles.headerTopRow}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="book-open" size={22} color={colors.primary} />
          </View>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.headerEyebrow, { color: colors.mutedForeground }]}>Student Academics</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Academics</Text>
          </View>
        </View>

        <View style={[styles.academicHero, { backgroundColor: colors.primary }]}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Academic Progress</Text>
            <Text style={styles.heroSubtitle}>{academicProfile}</Text>
          </View>
          <View style={styles.heroScoreBox}>
            <Text style={styles.heroScore}>{resultScore}</Text>
            <Text style={styles.heroScoreLabel}>{results.length > 0 ? "CGPA" : "CGPA"}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bar-chart-2" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{midMarks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Marks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="award" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{results.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Results</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="book" size={16} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{syllabus.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Subjects</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabSection}>
        <Text style={[styles.tabSectionTitle, { color: colors.mutedForeground }]}>Academic Records</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabPanel}>
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
                onPress={() => setActiveTab(t.key)}
              >
                <Feather name={t.icon as "book"} size={15} color={isActive ? "#fff" : colors.primary} />
                <Text style={[styles.tabText, { color: isActive ? "#fff" : colors.foreground }]} numberOfLines={1}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {activeTab === "gpacalc" ? (
        <SGPACalculator colors={colors} />
      ) : (
        <View style={styles.scroll}>

          {/* ── Mid Marks ── */}
          {activeTab === "midmarks" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mid-term Internal Marks</Text>
              <View style={[styles.infoBox, { backgroundColor: colors.primary + "0A", borderColor: colors.primary + "25" }]}>
                <Feather name="info" size={12} color={colors.primary} />
                <Text style={[styles.infoBoxText, { color: colors.primary }]}>
                  Internal assessment: Mid-1 &amp; Mid-2 (25 marks each). Best of the two counts as internal marks (25).
                </Text>
              </View>
              {midMarks.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="inbox" size={36} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No marks uploaded yet</Text>
                </View>
              ) : (
                midMarks.map((mark) => {
                  const internalBest = Math.max(mark.midTerm1, mark.midTerm2);
                  const hasExternal  = mark.externalMarks !== undefined;
                  const total        = hasExternal ? internalBest + (mark.externalMarks ?? 0) : mark.midTerm1 + mark.midTerm2;
                  const max          = hasExternal ? mark.maxMarks + (mark.maxExternal ?? 75) : mark.maxMarks * 2;
                  const pct          = Math.round((total / max) * 100);
                  const barColor     = pct >= 80 ? "#22C55E" : pct >= 60 ? "#3B82F6" : pct >= 40 ? "#F59E0B" : "#EF4444";
                  return (
                    <View key={mark.id} style={[styles.markCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.markHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.subjectName, { color: colors.foreground }]}>{mark.subjectName}</Text>
                          <Text style={[styles.subjectCode, { color: colors.mutedForeground }]}>{mark.subjectCode}</Text>
                        </View>
                        <View style={styles.markScoreCol}>
                          <Text style={[styles.totalScore, { color: barColor }]}>{total}/{max}</Text>
                          <Text style={[styles.pctText, { color: barColor }]}>{pct}%</Text>
                        </View>
                      </View>
                      <ProgressBar value={total} max={max} color={barColor} />
                      <View style={styles.midtermRow}>
                        <View style={[styles.midtermChip, { backgroundColor: "#6366F1" + "12" }]}>
                          <Text style={[styles.midtermLabel, { color: "#6366F1" }]}>Mid-1</Text>
                          <Text style={[styles.midtermValue, { color: colors.foreground }]}>{mark.midTerm1}/{mark.maxMarks}</Text>
                        </View>
                        <View style={[styles.midtermChip, { backgroundColor: "#F59E0B" + "12" }]}>
                          <Text style={[styles.midtermLabel, { color: "#F59E0B" }]}>Mid-2</Text>
                          <Text style={[styles.midtermValue, { color: colors.foreground }]}>{mark.midTerm2}/{mark.maxMarks}</Text>
                        </View>
                        <View style={[styles.midtermChip, { backgroundColor: "#22C55E" + "12" }]}>
                          <Text style={[styles.midtermLabel, { color: "#22C55E" }]}>Internal</Text>
                          <Text style={[styles.midtermValue, { color: colors.foreground }]}>{internalBest}/{mark.maxMarks}</Text>
                        </View>
                        {hasExternal && (
                          <View style={[styles.midtermChip, { backgroundColor: "#3B82F6" + "12" }]}>
                            <Text style={[styles.midtermLabel, { color: "#3B82F6" }]}>External</Text>
                            <Text style={[styles.midtermValue, { color: colors.foreground }]}>{mark.externalMarks}/{mark.maxExternal ?? 75}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* ── Results ── */}
          {activeTab === "results" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Semester Results</Text>
              {results.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="inbox" size={36} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results published yet</Text>
                </View>
              ) : (
                <>
                  {/* CGPA Banner */}
                  <View style={[styles.cgpaBanner, { backgroundColor: colors.primary }]}>
                    <View style={styles.cgpaBannerLeft}>
                      <Text style={styles.cgpaBannerLabel}>Overall CGPA</Text>
                      <Text style={styles.cgpaBannerValue}>{cgpa.toFixed(2)}</Text>
                      <Text style={styles.cgpaBannerSub}>{sgpaLabel(cgpa)}  ·  {gpToGrade(cgpa)}  ·  {results.length} Semesters</Text>
                    </View>
                    <View style={[styles.cgpaBannerCircle, { borderColor: "rgba(255,255,255,0.3)" }]}>
                      <Feather name="award" size={28} color="#fff" />
                    </View>
                  </View>

                  {/* Semester picker */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.semesterPicker}>
                    {results.map((r, i) => {
                      const semSgpa = r.sgpa ?? r.gpa ?? 0;
                      return (
                        <Pressable
                          key={r.id}
                          style={[styles.semChip, i === selectedSemIdx ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                          onPress={() => setSelectedSemIdx(i)}
                        >
                          <Text style={[styles.semChipSem, { color: i === selectedSemIdx ? "#fff" : colors.mutedForeground }]}>Semester {r.semester}</Text>
                          <Text style={[styles.semChipSgpa, { color: i === selectedSemIdx ? "rgba(255,255,255,0.85)" : colors.primary }]}>{semSgpa.toFixed(2)}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Semester detail */}
                  {semResult && (
                    <>
                      <View style={[styles.sgpaCard, { backgroundColor: colors.primary }]}>
                        <View style={styles.sgpaMain}>
                          <Text style={styles.sgpaLabel}>Semester {semResult.semester} — SGPA</Text>
                          <Text style={styles.sgpaValue}>{(semResult.sgpa ?? semResult.gpa ?? 0).toFixed(2)}</Text>
                          <GradeChip grade={semResult.grade} colors={colors} />
                        </View>
                        <Text style={styles.sgpaSubtitle}>{semResult.subjects.length} subjects  ·  CGPA so far: {cgpa.toFixed(2)}</Text>
                      </View>

                      {/* Subject-wise marks */}
                      <View style={[styles.subjectTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.tableHeader, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.tableHeaderCell, { color: colors.mutedForeground, flex: 2 }]}>Subject</Text>
                          <Text style={[styles.tableHeaderCell, { color: colors.mutedForeground }]}>Int.</Text>
                          <Text style={[styles.tableHeaderCell, { color: colors.mutedForeground }]}>Ext.</Text>
                          <Text style={[styles.tableHeaderCell, { color: colors.mutedForeground }]}>Total</Text>
                          <Text style={[styles.tableHeaderCell, { color: colors.mutedForeground }]}>Grade</Text>
                        </View>
                        {semResult.subjects.map((sub, idx) => {
                          const c = GRADE_POINTS.find((g) => g.grade === sub.grade)?.color ?? "#6B7280";
                              const internal = sub.internalMarks ?? 0;
                          const external = sub.externalMarks ?? 0;
                          const total    = sub.totalMarks ?? (internal + external);
                          return (
                            <View key={sub.code} style={[styles.tableRow, { borderTopColor: colors.border, borderTopWidth: idx > 0 ? 1 : 0 }]}>
                              <View style={{ flex: 2 }}>
                                <Text style={[styles.tableSubjectName, { color: colors.foreground }]} numberOfLines={2}>{sub.name}</Text>
                                <Text style={[styles.tableSubjectCode, { color: colors.mutedForeground }]}>{sub.code}</Text>
                              </View>
                              <Text style={[styles.tableCell, { color: colors.foreground }]}>{internal}</Text>
                              <Text style={[styles.tableCell, { color: colors.foreground }]}>{external}</Text>
                              <Text style={[styles.tableCell, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{total}</Text>
                              <View style={[styles.gradeCell, { backgroundColor: c + "18" }]}>
                                <Text style={[styles.gradeCellText, { color: c }]}>{sub.grade}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {/* ── Syllabus ── */}
          {activeTab === "syllabus" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Course Syllabus</Text>
              {syllabus.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="book" size={36} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No syllabus available</Text>
                </View>
              ) : (
                syllabus.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.syllabusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => { setExpandedSyllabus(expandedSyllabus === item.id ? null : item.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.syllabusHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.syllabusCodeRow}>
                          <View style={[styles.codeTag, { backgroundColor: colors.primary + "15" }]}>
                            <Text style={[styles.codeTagText, { color: colors.primary }]}>{item.subjectCode}</Text>
                          </View>
                          <View style={[styles.creditsTag, { backgroundColor: colors.secondary }]}>
                            <Text style={[styles.creditsTagText, { color: colors.mutedForeground }]}>{item.credits} Credits</Text>
                          </View>
                        </View>
                        <Text style={[styles.syllabusName, { color: colors.foreground }]}>{item.subjectName}</Text>
                        <Text style={[styles.syllabusDesc, { color: colors.mutedForeground }]} numberOfLines={expandedSyllabus === item.id ? 10 : 1}>{item.description}</Text>
                      </View>
                      <Feather name={expandedSyllabus === item.id ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                    </View>
                    {expandedSyllabus === item.id && (
                      <View style={[styles.topicsList, { borderTopColor: colors.border }]}>
                        <Text style={[styles.topicsHeading, { color: colors.mutedForeground }]}>UNITS / TOPICS</Text>
                        {item.topics.map((topic, i) => (
                          <View key={i} style={styles.topicRow}>
                            <View style={[styles.topicNum, { backgroundColor: colors.primary + "15" }]}>
                              <Text style={[styles.topicNumText, { color: colors.primary }]}>{i + 1}</Text>
                            </View>
                            <Text style={[styles.topicText, { color: colors.foreground }]}>{topic}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageScroll: { gap: 0 },
  academicHeader: { paddingHorizontal: 20, paddingTop: Platform.OS === "web" ? 18 : 14, gap: 12 },
  headerTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitleBlock: { flex: 1 },
  headerEyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 2 },
  academicHero: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  heroTextBlock: { flex: 1, gap: 5 },
  heroTitle: { color: "#fff", fontSize: 21, fontFamily: "Inter_700Bold" },
  heroSubtitle: { color: "rgba(255,255,255,0.84)", fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  heroScoreBox: { width: 68, height: 68, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  heroScore: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  heroScoreLabel: { color: "rgba(255,255,255,0.72)", fontSize: 10, fontFamily: "Inter_700Bold", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4, minHeight: 76 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tabSection: { paddingHorizontal: 20, marginTop: 14, gap: 8 },
  tabSectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  tabPanel: { gap: 8, paddingRight: 20 },
  tab: { minHeight: 40, minWidth: 118, borderWidth: 1, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 13 },
  tabText: { fontSize: 12, fontFamily: "Inter_700Bold", flexShrink: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 18 },
  section: { gap: 14 },
  sectionTitle: { fontSize: 21, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12 },
  infoBoxText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  emptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 18, gap: 12, borderRadius: 16, borderWidth: 1 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  // Mid marks
  markCard: { borderRadius: 16, padding: 15, borderWidth: 1, gap: 12 },
  markHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  subjectName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subjectCode: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  markScoreCol: { alignItems: "flex-end" },
  totalScore: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pctText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  progressBg: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  midtermRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  midtermChip: { flex: 1, minWidth: 60, alignItems: "center", borderRadius: 10, paddingVertical: 8 },
  midtermLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  midtermValue: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 2 },
  // Results
  cgpaBanner: { borderRadius: 18, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cgpaBannerLeft: { gap: 4 },
  cgpaBannerLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  cgpaBannerValue: { color: "#fff", fontSize: 40, fontFamily: "Inter_700Bold" },
  cgpaBannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_500Medium" },
  cgpaBannerCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  semesterPicker: { gap: 8, paddingVertical: 4, paddingBottom: 8 },
  semChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignItems: "center", minWidth: 90 },
  semChipSem: { fontSize: 11, fontFamily: "Inter_500Medium" },
  semChipSgpa: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  sgpaCard: { borderRadius: 14, padding: 18, gap: 8 },
  sgpaMain: { flexDirection: "row", alignItems: "center", gap: 14 },
  sgpaLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  sgpaValue: { color: "#fff", fontSize: 32, fontFamily: "Inter_700Bold", flex: 1 },
  sgpaSubtitle: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: "Inter_400Regular" },
  subjectTable: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tableHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  tableHeaderCell: { fontSize: 10, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  tableSubjectName: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 16 },
  tableSubjectCode: { fontSize: 10, fontFamily: "Inter_400Regular" },
  tableCell: { flex: 1, textAlign: "center", fontSize: 12, fontFamily: "Inter_500Medium" },
  gradeCell: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 6, paddingVertical: 4 },
  gradeCellText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  // Syllabus
  syllabusCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  syllabusHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  syllabusCodeRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  codeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  codeTagText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  creditsTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  creditsTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  syllabusName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  syllabusDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  topicsList: { borderTopWidth: 1, padding: 14, gap: 8 },
  topicsHeading: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 4 },
  topicRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  topicNum: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  topicNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  topicText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 19 },
  // SGPA Calc
  calcScroll: { paddingHorizontal: 20, paddingTop: 16 },
  cgpaCard: { borderRadius: 20, padding: 22, marginBottom: 14, gap: 12 },
  cgpaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cgpaHeading: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  cgpaScale: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  scaleBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  scaleBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
  cgpaValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  cgpaValue: { fontSize: 56, fontFamily: "Inter_700Bold" },
  cgpaMax: { color: "rgba(255,255,255,0.5)", fontSize: 20, fontFamily: "Inter_400Regular", marginBottom: 8 },
  cgpaBarBg: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, overflow: "hidden" },
  cgpaBarFill: { height: 8, borderRadius: 4 },
  cgpaFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cgpaLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  cgpaCredits: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular" },
  cgpaHint: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontFamily: "Inter_400Regular" },
  cgpaNote: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 14 },
  cgpaNoteText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  subjectsTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  actionBtns: { flexDirection: "row", gap: 8 },
  miniBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  miniBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  subjectCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10, gap: 10 },
  subjectCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  subjectCardName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subjectCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  subjectCardRight: { flexShrink: 0 },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  gpBadge: { alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  gpBadgeGrade: { fontSize: 16, fontFamily: "Inter_700Bold" },
  gpBadgePoints: { fontSize: 11, fontFamily: "Inter_500Medium" },
  clearBtn: { padding: 4 },
  pickGradeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  pickGradeBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  subjectBarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  subjectBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  subjectBarFill: { height: 6, borderRadius: 3 },
  gpText: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 32, textAlign: "right" },
  // Modals
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  gradeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 14 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gradeOption: { width: "22%", alignItems: "center", borderRadius: 12, paddingVertical: 12, borderWidth: 1, gap: 2 },
  gradeOptionLabel: { fontSize: 18, fontFamily: "Inter_700Bold" },
  gradeOptionPoints: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  gradeOptionRange: { fontSize: 10, fontFamily: "Inter_400Regular" },
  addSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, gap: 14 },
  addField: { gap: 6 },
  addFieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  addFieldInput: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  addInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  addSubjectBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  addSubjectBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scaleSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, gap: 10 },
  scaleRow: { flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, paddingVertical: 10 },
  scaleGradeBadge: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  scaleGrade: { fontSize: 15, fontFamily: "Inter_700Bold" },
  scaleRange: { fontSize: 14, fontFamily: "Inter_500Medium" },
  scaleRangeLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  scalePoints: { fontSize: 14, fontFamily: "Inter_700Bold" },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 12, borderWidth: 1 },
});
