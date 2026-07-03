import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useState } from "react";
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

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useColors } from "@/hooks/useColors";
import DropdownPicker from "@/components/DropdownPicker";
import { YEARS, BRANCHES } from "@/constants/academia";
import { getApiUrl } from "@/utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedSubject {
  name: string;
  mid1?: number;
  mid2?: number;
  total?: number;
  grade?: string;
}

interface ParsedRecord {
  rollNumber: string;
  name: string;
  subjects: ParsedSubject[];
  gpa?: number;
  semester?: number;
  status: "ok" | "warning" | "error";
  note?: string;
}

interface ParseResult {
  success: true;
  format: "pdf" | "csv";
  dataType: string;
  year: string;
  branch: string;
  semester: number;
  filename: string;
  records: ParsedRecord[];
  headers: string[];
  rawSample: string;
  stats: { total: number; parsed: number; warnings: number; failed: number };
}

interface HistoryEntry {
  id: string;
  filename: string;
  uploadedAt: string;
  year: string;
  branch: string;
  semester: number;
  dataType: string;
  format: string;
  recordCount: number;
  successCount: number;
}

type Step = "configure" | "uploading" | "preview" | "done";

const DATA_TYPES = [
  { label: "Mid-term Marks",   value: "midmarks" },
  { label: "Semester Results", value: "results"  },
];

const SEMESTERS = [1,2,3,4,5,6,7,8].map((n) => ({ label: `Semester ${n}`, value: String(n) }));


// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

// ─── Edit Record Modal ────────────────────────────────────────────────────────

function EditRecordModal({
  record,
  visible,
  onClose,
  onSave,
  colors,
}: {
  record: ParsedRecord | null;
  visible: boolean;
  onClose: () => void;
  onSave: (r: ParsedRecord) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [local, setLocal] = useState<ParsedRecord | null>(null);
  useEffect(() => { if (record) setLocal(JSON.parse(JSON.stringify(record))); }, [record]);
  if (!local) return null;

  const update = (key: keyof ParsedRecord, val: string) =>
    setLocal((p) => p ? { ...p, [key]: val } : p);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.editSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Record</Text>

          {[
            { label: "Roll Number", key: "rollNumber" as const },
            { label: "Student Name", key: "name" as const },
          ].map(({ label, key }) => (
            <View key={key} style={styles.editField}>
              <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={String(local[key] ?? "")}
                  onChangeText={(v) => update(key, v)}
                />
              </View>
            </View>
          ))}

          {local.subjects.map((sub, idx) => (
            <View key={idx} style={styles.editField}>
              <Text style={[styles.editFieldLabel, { color: colors.mutedForeground }]}>{sub.name}</Text>
              <View style={styles.subjectMarkRow}>
                {sub.total !== undefined && (
                  <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary, flex: 1 }]}>
                    <Text style={[styles.markLabel, { color: colors.mutedForeground }]}>Total</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      value={String(sub.total ?? "")}
                      onChangeText={(v) => {
                        const s = [...local.subjects];
                        s[idx] = { ...s[idx], total: parseFloat(v) || 0 };
                        setLocal((p) => p ? { ...p, subjects: s } : p);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                )}
                {sub.mid1 !== undefined && (
                  <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary, flex: 1 }]}>
                    <Text style={[styles.markLabel, { color: colors.mutedForeground }]}>Mid 1</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      value={String(sub.mid1 ?? "")}
                      onChangeText={(v) => {
                        const s = [...local.subjects];
                        s[idx] = { ...s[idx], mid1: parseFloat(v) || 0 };
                        setLocal((p) => p ? { ...p, subjects: s } : p);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                )}
                {sub.mid2 !== undefined && (
                  <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.secondary, flex: 1 }]}>
                    <Text style={[styles.markLabel, { color: colors.mutedForeground }]}>Mid 2</Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      value={String(sub.mid2 ?? "")}
                      onChangeText={(v) => {
                        const s = [...local.subjects];
                        s[idx] = { ...s[idx], mid2: parseFloat(v) || 0 };
                        setLocal((p) => p ? { ...p, subjects: s } : p);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </View>
            </View>
          ))}

          <View style={styles.editActions}>
            <Pressable
              style={[styles.editCancelBtn, { backgroundColor: colors.secondary }]}
              onPress={onClose}
            >
              <Text style={[styles.editCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
              onPress={() => { onSave({ ...local, status: "ok", note: undefined }); onClose(); }}
            >
              <Text style={styles.editSaveText}>Save Changes</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function BulkUploadScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { user }  = useAuth();
  const { addMidMark, addSemesterResult } = useAppData();

  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [step, setStep]           = useState<Step>("configure");

  // Config
  const [year,     setYear]     = useState("");
  const [branch,   setBranch]   = useState("");
  const [semester, setSemester] = useState("5");
  const [dataType, setDataType] = useState("midmarks");

  // File / result
  const [pickedFile, setPickedFile]   = useState<{ name: string; uri: string; type: string } | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [records, setRecords]         = useState<ParsedRecord[]>([]);
  const [error, setError]             = useState("");
  const [saving, setSaving]           = useState(false);

  // Edit modal
  const [editRecord, setEditRecord]   = useState<ParsedRecord | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    try {
      const result = await apiJson<{ success: boolean; history: HistoryEntry[] }>("/api/data/upload-history");
      setHistory(result.history);
    } catch (_) {}
  }

  async function saveHistory(entry: HistoryEntry) {
    let savedEntry = entry;
    try {
      const result = await apiJson<{ success: boolean; id: string }>("/api/data/upload-history", { method: "POST", body: JSON.stringify(entry) });
      savedEntry = { ...entry, id: result.id };
    } catch (_) {}
    const updated = [savedEntry, ...history].slice(0, 50);
    setHistory(updated);
  }

  // Step 1: Pick file and send to server
  async function handlePickAndUpload() {
    setError("");
    let picked;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/csv", "text/plain", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      picked = result.assets?.[0];
      if (!picked) return;
    } catch {
      setError("Could not open file picker. Please try again.");
      return;
    }

    setPickedFile({ name: picked.name, uri: picked.uri, type: picked.mimeType ?? "" });
    setStep("uploading");

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: picked.uri,
        name: picked.name,
        type: picked.mimeType || "application/octet-stream",
      } as unknown as Blob);
      formData.append("year", year);
      formData.append("branch", branch);
      formData.append("semester", semester);
      formData.append("dataType", dataType);

      const apiUrl = getApiUrl("/api/bulk-upload/parse");
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? `Server error (${res.status})`);
        setStep("configure");
        return;
      }

      setParseResult(json as ParseResult);
      setRecords(json.records);
      setStep("preview");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(
        err instanceof TypeError && err.message.includes("Network")
          ? "Cannot reach the API server. Make sure it is running."
          : String(err)
      );
      setStep("configure");
    }
  }

  // ── Step 2: Confirm and save ──────────────────────────────────────────────
  async function handleConfirm() {
    if (!parseResult || !user) return;
    setSaving(true);

    const okRecords = records.filter((r) => r.status !== "error");
    let savedCount = 0;

    for (const rec of okRecords) {
      try {
        if (dataType === "midmarks") {
          for (const sub of rec.subjects) {
            await addMidMark({
              studentId: rec.rollNumber,
              subjectCode: sub.name.slice(0, 8).toUpperCase(),
              subjectName: sub.name,
              midTerm1: sub.mid1 ?? sub.total ?? 0,
              midTerm2: sub.mid2 ?? 0,
              maxMarks: 25,
            });
          }
        } else {
          const semGpa = rec.gpa ?? 0;
          await addSemesterResult({
            studentId: rec.rollNumber,
            semester: parseResult.semester || parseInt(semester),
            sgpa: semGpa,
            cgpa: semGpa,
            gpa: semGpa,
            grade: semGpa >= 9 ? "O" : semGpa >= 8 ? "A+" : semGpa >= 7 ? "A" : semGpa >= 6 ? "B+" : semGpa >= 5 ? "B" : semGpa >= 4 ? "C" : "F",
            subjects: rec.subjects.map((s) => ({
              code: s.name.slice(0, 8).toUpperCase(),
              name: s.name,
              internalMarks: Math.round((s.total ?? 0) * 0.25),
              externalMarks: Math.round((s.total ?? 0) * 0.75),
              totalMarks: s.total ?? 0,
              maxMarks: 100,
              grade: s.grade ?? "—",
              gradePoints: s.grade === "O" ? 10 : s.grade === "A+" ? 9 : s.grade === "A" ? 8 : s.grade === "B+" ? 7 : s.grade === "B" ? 6 : s.grade === "C" ? 5 : s.grade === "P" ? 4 : 0,
              credits: 3,
            })),
          });
        }
        savedCount++;
      } catch {
        // Continue with others
      }
    }

    // Save history entry
    await saveHistory({
      id: "upload-" + Date.now(),
      filename: parseResult.filename,
      uploadedAt: new Date().toISOString(),
      year: parseResult.year,
      branch: parseResult.branch,
      semester: parseResult.semester,
      dataType: parseResult.dataType,
      format: parseResult.format,
      recordCount: records.length,
      successCount: savedCount,
    });

    setSaving(false);
    setStep("done");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function resetFlow() {
    setStep("configure");
    setPickedFile(null);
    setParseResult(null);
    setRecords([]);
    setError("");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const statCounts = parseResult
    ? {
        ok:       records.filter((r) => r.status === "ok").length,
        warnings: records.filter((r) => r.status === "warning").length,
        errors:   records.filter((r) => r.status === "error").length,
      }
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["upload", "history"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t)}
          >
            <Feather
              name={t === "upload" ? "upload-cloud" : "clock"}
              size={15}
              color={activeTab === t ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "upload" ? "Bulk Upload" : "History"}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "history" ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40, paddingTop: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Upload History</Text>
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No uploads yet</Text>
            </View>
          ) : (
            history.map((h) => (
              <View key={h.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.historyIcon, { backgroundColor: h.format === "pdf" ? "#EF4444" + "18" : "#22C55E" + "18" }]}>
                  <Feather name={h.format === "pdf" ? "file-text" : "file"} size={20} color={h.format === "pdf" ? "#EF4444" : "#22C55E"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.historyFilename, { color: colors.foreground }]} numberOfLines={1}>{h.filename}</Text>
                  <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                    {h.year} Yr · {h.branch} · Sem {h.semester} · {h.dataType}
                  </Text>
                  <View style={styles.historyStats}>
                    <View style={[styles.historyBadge, { backgroundColor: "#22C55E" + "18" }]}>
                      <Text style={[styles.historyBadgeText, { color: "#22C55E" }]}>{h.successCount} saved</Text>
                    </View>
                    <View style={[styles.historyBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.historyBadgeText, { color: colors.mutedForeground }]}>{h.recordCount} total</Text>
                    </View>
                    <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>{relTime(h.uploadedAt)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 60, paddingTop: 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Configure ── */}
          {step === "configure" && (
            <>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Bulk Upload</Text>
              <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
                Upload a PDF or CSV with marks for an entire class. The app extracts student records automatically.
              </Text>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>1. Configure Upload</Text>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Year</Text>
                  <DropdownPicker label="Year" value={year} options={YEARS} onSelect={setYear} icon="calendar" placeholder="Select year" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Branch</Text>
                  <DropdownPicker label="Branch" value={branch} options={BRANCHES} onSelect={setBranch} icon="book" placeholder="Select branch" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Semester</Text>
                  <DropdownPicker label="Semester" value={semester} options={SEMESTERS} onSelect={setSemester} icon="layers" />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Data Type</Text>
                  <DropdownPicker label="Data Type" value={dataType} options={DATA_TYPES} onSelect={setDataType} icon="database" />
                </View>
              </View>

              {/* CSV Format reference */}
              <View style={[styles.formatCard, { backgroundColor: colors.primary + "0A", borderColor: colors.primary + "30" }]}>
                <View style={styles.formatHeader}>
                  <Feather name="info" size={14} color={colors.primary} />
                  <Text style={[styles.formatTitle, { color: colors.primary }]}>Expected CSV Format</Text>
                </View>
                <View style={[styles.codeBlock, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.codeText, { color: colors.foreground }]}>
                    {dataType === "midmarks"
                      ? `Roll Number,Name,DS Mid 1,DS Mid 2,OS Mid 1,OS Mid 2\nCS20001,Alex Kumar,18,22,21,20\nCS20002,Priya Sharma,20,21,19,23`
                      : `Roll Number,Name,Data Structures,OS,DBMS,GPA\nCS20001,Alex Kumar,85,78,90,8.5\nCS20002,Priya Sharma,80,85,88,8.2`
                    }
                  </Text>
                </View>
                <Text style={[styles.formatNote, { color: colors.mutedForeground }]}>
                  PDFs with properly formatted tables are also supported.
                </Text>
              </View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + "12" }]}>
                  <Feather name="alert-triangle" size={16} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                onPress={handlePickAndUpload}
                activeOpacity={0.85}
              >
                <Feather name="upload-cloud" size={20} color="#fff" />
                <Text style={styles.uploadBtnText}>Select PDF / CSV File</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Uploading ── */}
          {step === "uploading" && (
            <View style={styles.loadingState}>
              <View style={[styles.loadingCircle, { backgroundColor: colors.primary + "18" }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
              <Text style={[styles.loadingTitle, { color: colors.foreground }]}>Extracting records…</Text>
              <Text style={[styles.loadingSubtitle, { color: colors.mutedForeground }]}>
                {pickedFile?.name}
              </Text>
              <Text style={[styles.loadingSubtitle, { color: colors.mutedForeground }]}>
                Sending to server and parsing student data
              </Text>
            </View>
          )}

          {/* ── Preview ── */}
          {step === "preview" && parseResult && statCounts && (
            <>
              <View style={styles.previewHeader}>
                <TouchableOpacity onPress={resetFlow} style={styles.backBtn}>
                  <Feather name="arrow-left" size={18} color={colors.foreground} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pageTitle, { color: colors.foreground, marginBottom: 0 }]}>Preview</Text>
                  <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {parseResult.filename}
                  </Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                {[
                  { label: "Total",    value: parseResult.stats.total,    color: colors.foreground,  bg: colors.card },
                  { label: "Parsed",   value: statCounts.ok,              color: "#22C55E",           bg: "#22C55E" + "12" },
                  { label: "Warnings", value: statCounts.warnings,        color: "#F59E0B",           bg: "#F59E0B" + "12" },
                  { label: "Errors",   value: statCounts.errors,          color: "#EF4444",           bg: "#EF4444" + "12" },
                ].map((s) => (
                  <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg, borderColor: colors.border }]}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Filter info */}
              <View style={[styles.filterBadge, { backgroundColor: colors.secondary }]}>
                <Feather name="filter" size={12} color={colors.mutedForeground} />
                <Text style={[styles.filterBadgeText, { color: colors.mutedForeground }]}>
                  {parseResult.year} Year · {parseResult.branch} · Semester {parseResult.semester} · {parseResult.dataType}
                </Text>
              </View>

              {/* Record list */}
              {records.map((rec, idx) => {
                const statusColor = rec.status === "ok" ? "#22C55E" : rec.status === "warning" ? "#F59E0B" : "#EF4444";
                return (
                  <View key={idx} style={[styles.recordCard, { backgroundColor: colors.card, borderColor: rec.status !== "ok" ? statusColor + "40" : colors.border }]}>
                    <View style={styles.recordHeader}>
                      <View style={[styles.recordDot, { backgroundColor: statusColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recordName, { color: colors.foreground }]}>{rec.name}</Text>
                        <Text style={[styles.recordRoll, { color: colors.mutedForeground }]}>{rec.rollNumber}</Text>
                      </View>
                      {rec.gpa !== undefined && (
                        <View style={[styles.gpaBadge, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.gpaBadgeText, { color: colors.primary }]}>GPA {rec.gpa.toFixed(2)}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.editBtn, { backgroundColor: colors.secondary }]}
                        onPress={() => { setEditRecord(rec); setEditVisible(true); }}
                      >
                        <Feather name="edit-2" size={12} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>

                    {rec.note && (
                      <View style={[styles.noteRow, { backgroundColor: statusColor + "12" }]}>
                        <Feather name="alert-circle" size={11} color={statusColor} />
                        <Text style={[styles.noteText, { color: statusColor }]}>{rec.note}</Text>
                      </View>
                    )}

                    {rec.subjects.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectRow}>
                        {rec.subjects.map((sub, si) => (
                          <View key={si} style={[styles.subjectChip, { backgroundColor: colors.secondary }]}>
                            <Text style={[styles.subjectChipName, { color: colors.mutedForeground }]}>{sub.name}</Text>
                            <Text style={[styles.subjectChipMark, { color: colors.foreground }]}>
                              {sub.total !== undefined ? sub.total
                                : sub.mid1 !== undefined ? `${sub.mid1}+${sub.mid2 ?? 0}`
                                : "—"}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                );
              })}

              {/* Confirm button */}
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                onPress={handleConfirm}
                disabled={saving || statCounts.ok === 0}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                      Save {statCounts.ok} records to database
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ── Done ── */}
          {step === "done" && parseResult && (
            <View style={styles.doneState}>
              <View style={[styles.doneCircle, { backgroundColor: "#22C55E" + "18" }]}>
                <Feather name="check-circle" size={48} color="#22C55E" />
              </View>
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>Upload Complete!</Text>
              <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
                {statCounts?.ok ?? 0} student records were saved successfully
              </Text>
              <View style={[styles.doneSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {[
                  { label: "File",      value: parseResult.filename },
                  { label: "Year",      value: parseResult.year ? `${parseResult.year} Year` : "—" },
                  { label: "Branch",    value: parseResult.branch || "—" },
                  { label: "Semester",  value: `Semester ${parseResult.semester}` },
                  { label: "Data Type", value: parseResult.dataType },
                  { label: "Format",    value: parseResult.format.toUpperCase() },
                ].map(({ label, value }) => (
                  <View key={label} style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                onPress={resetFlow}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>Upload Another File</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <EditRecordModal
        record={editRecord}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSave={(updated) => {
          setRecords((prev) => prev.map((r, i) => (r.rollNumber === editRecord?.rollNumber ? updated : r)));
        }}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20, lineHeight: 18 },
  card: { borderRadius: 18, padding: 20, borderWidth: 1, gap: 14, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  formatCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10, marginBottom: 16 },
  formatHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  formatTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  codeBlock: { borderRadius: 8, padding: 12 },
  codeText: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 11, lineHeight: 17 },
  formatNote: { fontSize: 12, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  uploadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  uploadBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  loadingState: { alignItems: "center", paddingVertical: 80, gap: 16 },
  loadingCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  loadingTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  loadingSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center", gap: 2, borderWidth: 1 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  filterBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginBottom: 14 },
  filterBadgeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recordCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8, marginBottom: 10 },
  recordHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  recordDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  recordName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  recordRoll: { fontSize: 12, fontFamily: "Inter_400Regular" },
  gpaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  gpaBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  editBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  noteText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  subjectRow: { flexGrow: 0 },
  subjectChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 6, alignItems: "center" },
  subjectChipName: { fontSize: 10, fontFamily: "Inter_400Regular" },
  subjectChipMark: { fontSize: 13, fontFamily: "Inter_700Bold" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14, marginTop: 12 },
  confirmBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  doneState: { alignItems: "center", paddingVertical: 40, gap: 14 },
  doneCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  doneSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  doneSummary: { width: "100%", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_500Medium", maxWidth: "55%", textAlign: "right" },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  doneBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  historyCard: { flexDirection: "row", gap: 14, alignItems: "flex-start", borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  historyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  historyFilename: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  historyMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6 },
  historyStats: { flexDirection: "row", gap: 6, alignItems: "center" },
  historyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  historyBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  historyTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, gap: 14, maxHeight: "85%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  editField: { gap: 6 },
  editFieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  markLabel: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 35 },
  subjectMarkRow: { flexDirection: "row", gap: 8 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  editCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  editCancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  editSaveBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  editSaveText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
