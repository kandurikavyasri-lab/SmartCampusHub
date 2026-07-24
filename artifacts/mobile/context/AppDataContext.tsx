import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { NotifCategory } from "@/constants/academia";
import { getApiUrl } from "@/utils/api";

export interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  room: string;
  teacher: string;
  year: string;
  branch: string;
  section: string;
  batch: string;
}

export interface MidMark {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  midTerm1: number;
  midTerm2: number;
  maxMarks: number;
  academicYear?: string;
  externalMarks?: number;
  maxExternal?: number;
}

export interface SubjectResult {
  code: string;
  name: string;
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  maxMarks: number;
  grade: string;
  gradePoints: number;
  credits: number;
}

export interface SemesterResult {
  id: string;
  studentId: string;
  semester: number;
  academicYear?: string;
  sgpa: number;
  cgpa: number;
  grade: string;
  subjects: SubjectResult[];
  gpa?: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  year: string;
  branch: string;
  semester: number;
  credits: number;
  academicYear: string;
  isActive?: boolean;
}

export interface SyllabusItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  description: string;
  topics: string[];
  credits: number;
  year: string;
  branch: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  category: NotifCategory;
  targetYear: string;
  targetBranch: string;
  targetBatch: string;
  sentBy: string;
  isRead: boolean;
}

interface AppDataContextType {
  timetable: TimetableEntry[];
  midMarks: MidMark[];
  semesterResults: SemesterResult[];
  syllabus: SyllabusItem[];
  subjects: Subject[];
  notifications: Notification[];
  addTimetableEntry:    (entry: Omit<TimetableEntry, "id">) => Promise<void>;
  updateTimetableEntry: (entry: TimetableEntry) => Promise<void>;
  deleteTimetableEntry: (id: string) => Promise<void>;
  addMidMark:           (mark: Omit<MidMark, "id">) => Promise<void>;
  addSemesterResult:    (result: Omit<SemesterResult, "id">) => Promise<void>;
  addNotification:      (n: Omit<Notification, "id" | "timestamp" | "isRead">) => Promise<void>;
  updateNotification:   (n: Notification) => Promise<void>;
  deleteNotification:   (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  getStudentMidMarks:       (studentIds: string | string[], academicYear?: string) => MidMark[];
  getStudentResults:        (studentIds: string | string[], academicYear?: string) => SemesterResult[];
  getStudentTimetable:      (year: string, branch: string, section: string) => TimetableEntry[];
  getStudentNotifications:  (year: string, branch: string) => Notification[];
  getStudentSyllabus:       (year: string, branch: string) => SyllabusItem[];
}

const AppDataContext = createContext<AppDataContextType | null>(null);

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [midMarks, setMidMarks] = useState<MidMark[]>([]);
  const [semesterResults, setSemesterResults] = useState<SemesterResult[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const remote = await apiJson<{
        timetable: TimetableEntry[];
        midMarks: MidMark[];
        semesterResults: SemesterResult[];
        syllabus?: SyllabusItem[];
        subjects?: Subject[];
        notifications: Notification[];
      }>("/api/data/bootstrap");
      setTimetable(remote.timetable ?? []);
      setMidMarks(remote.midMarks ?? []);
      setSemesterResults(remote.semesterResults ?? []);
      setSyllabus(remote.syllabus ?? []);
      setSubjects(remote.subjects ?? []);
      setNotifications(remote.notifications ?? []);
    } catch (error) {
      console.warn("Could not load campus data", error);
      setTimetable([]);
      setMidMarks([]);
      setSemesterResults([]);
      setSyllabus([]);
      setSubjects([]);
      setNotifications([]);
    }
  }

  async function addTimetableEntry(entry: Omit<TimetableEntry, "id">) {
    const result = await apiJson<{ success: boolean; id: string }>("/api/data/timetable", { method: "POST", body: JSON.stringify(entry) });
    setTimetable((current) => [...current, { ...entry, id: result.id }]);
  }

  async function updateTimetableEntry(entry: TimetableEntry) {
    await apiJson("/api/data/timetable/" + entry.id, { method: "PUT", body: JSON.stringify(entry) });
    setTimetable((current) => current.map((t) => (t.id === entry.id ? entry : t)));
  }

  async function deleteTimetableEntry(id: string) {
    await apiJson("/api/data/timetable/" + id, { method: "DELETE" });
    setTimetable((current) => current.filter((t) => t.id !== id));
  }

  async function addMidMark(mark: Omit<MidMark, "id">) {
    const result = await apiJson<{ success: boolean; id: string }>("/api/data/mid-marks", { method: "POST", body: JSON.stringify(mark) });
    const normalized = {
      ...mark,
      midTerm1: Number((mark as any).midTerm1 ?? 0),
      midTerm2: Number((mark as any).midTerm2 ?? 0),
      maxMarks: Number((mark as any).maxMarks ?? 30),
      academicYear: (mark as any).academicYear,
    };
    setMidMarks((current) => [...current, { ...normalized, id: result.id }]);
  }

  async function addSemesterResult(result: Omit<SemesterResult, "id">) {
    const saved = await apiJson<{ success: boolean; id: string }>("/api/data/semester-results", { method: "POST", body: JSON.stringify(result) });
    setSemesterResults((current) => [...current, { ...result, id: saved.id }]);
  }

  async function addNotification(n: Omit<Notification, "id" | "timestamp" | "isRead">) {
    const result = await apiJson<{ success: boolean; id: string; timestamp: string }>("/api/data/notifications", { method: "POST", body: JSON.stringify(n) });
    setNotifications((current) => [{ ...n, id: result.id, timestamp: result.timestamp, isRead: false }, ...current]);
  }

  async function updateNotification(n: Notification) {
    const result = await apiJson<{ success: boolean; notification: Notification }>("/api/data/notifications/" + n.id, { method: "PUT", body: JSON.stringify(n) });
    setNotifications((current) => current.map((item) => (item.id === n.id ? result.notification : item)));
  }

  async function deleteNotification(id: string) {
    await apiJson("/api/data/notifications/" + id, { method: "DELETE" });
    setNotifications((current) => current.filter((n) => n.id !== id));
  }

  async function markNotificationRead(id: string) {
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  const getStudentMidMarks = useCallback(
    (studentIds: string | string[], academicYear?: string) => {
      const ids = (Array.isArray(studentIds) ? studentIds : [studentIds])
        .filter(Boolean)
        .map((id) => String(id).trim().toLowerCase());
      return midMarks.filter((m) => {
        const idMatch = ids.includes(String(m.studentId).trim().toLowerCase());
        const yearMatch = !academicYear || !m.academicYear || m.academicYear === academicYear;
        return idMatch && yearMatch;
      });
    },
    [midMarks]
  );

  const getStudentResults = useCallback(
    (studentIds: string | string[], academicYear?: string) => {
      const ids = (Array.isArray(studentIds) ? studentIds : [studentIds])
        .filter(Boolean)
        .map((id) => String(id).trim().toLowerCase());
      return semesterResults.filter((r) => {
        const idMatch = ids.includes(String(r.studentId).trim().toLowerCase());
        const yearMatch = !academicYear || !r.academicYear || r.academicYear === academicYear;
        return idMatch && yearMatch;
      });
    },
    [semesterResults]
  );

  const getStudentTimetable = useCallback(
    (year: string, branch: string, section: string) =>
      timetable.filter((t) => {
        const yMatch = !t.year || t.year === "All" || t.year === year;
        const bMatch = !t.branch || t.branch === "All" || t.branch === branch;
        const sMatch = !t.section || t.section === "All" || t.section === section;
        return yMatch && bMatch && sMatch;
      }),
    [timetable]
  );

  const getStudentNotifications = useCallback(
    (year: string, branch: string) =>
      notifications.filter((n) => {
        const yMatch = !n.targetYear || n.targetYear === "All" || n.targetYear === year;
        const bMatch = !n.targetBranch || n.targetBranch === "All" || n.targetBranch === branch;
        return yMatch && bMatch;
      }),
    [notifications]
  );

  const getStudentSyllabus = useCallback(
    (year: string, branch: string) =>
      syllabus.filter((s) => {
        const yMatch = !s.year || s.year === "All" || s.year === year;
        const bMatch = !s.branch || s.branch === "All" || s.branch === branch;
        return yMatch && bMatch;
      }),
    [syllabus]
  );

  return (
    <AppDataContext.Provider
      value={{
        timetable, midMarks, semesterResults, syllabus, subjects, notifications,
        addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
        addMidMark, addSemesterResult, addNotification, updateNotification, deleteNotification, markNotificationRead,
        getStudentMidMarks, getStudentResults, getStudentTimetable,
        getStudentNotifications, getStudentSyllabus,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
