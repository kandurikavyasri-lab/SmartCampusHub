import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  endTime: string;
  subject: string;
  subjectCode: string;
  room: string;
  teacher: string;
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
}

export interface SubjectResult {
  code: string;
  name: string;
  marks: number;
  maxMarks: number;
  grade: string;
}

export interface SemesterResult {
  id: string;
  studentId: string;
  semester: number;
  gpa: number;
  grade: string;
  subjects: SubjectResult[];
}

export interface SyllabusItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  description: string;
  topics: string[];
  credits: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  targetBatch: string;
  sentBy: string;
  isRead: boolean;
}

const SEED_TIMETABLE: TimetableEntry[] = [
  { id: "tt1", day: "Monday", time: "09:00", endTime: "10:00", subject: "Data Structures", subjectCode: "CS301", room: "Lab 201", teacher: "Prof. Williams", batch: "CS-2022" },
  { id: "tt2", day: "Monday", time: "11:00", endTime: "12:00", subject: "Operating Systems", subjectCode: "CS302", room: "Room 105", teacher: "Dr. Patel", batch: "CS-2022" },
  { id: "tt3", day: "Monday", time: "14:00", endTime: "15:00", subject: "Database Management", subjectCode: "CS303", room: "Room 203", teacher: "Prof. Chen", batch: "CS-2022" },
  { id: "tt4", day: "Tuesday", time: "10:00", endTime: "11:00", subject: "Computer Networks", subjectCode: "CS304", room: "Room 107", teacher: "Dr. Smith", batch: "CS-2022" },
  { id: "tt5", day: "Tuesday", time: "13:00", endTime: "14:30", subject: "Software Engineering", subjectCode: "CS305", room: "Lab 302", teacher: "Prof. Davis", batch: "CS-2022" },
  { id: "tt6", day: "Wednesday", time: "09:00", endTime: "10:00", subject: "Data Structures", subjectCode: "CS301", room: "Lab 201", teacher: "Prof. Williams", batch: "CS-2022" },
  { id: "tt7", day: "Wednesday", time: "11:00", endTime: "12:30", subject: "Machine Learning", subjectCode: "CS306", room: "Room 305", teacher: "Dr. Lee", batch: "CS-2022" },
  { id: "tt8", day: "Thursday", time: "10:00", endTime: "11:00", subject: "Operating Systems", subjectCode: "CS302", room: "Lab 201", teacher: "Dr. Patel", batch: "CS-2022" },
  { id: "tt9", day: "Thursday", time: "14:00", endTime: "15:00", subject: "Computer Networks", subjectCode: "CS304", room: "Room 107", teacher: "Dr. Smith", batch: "CS-2022" },
  { id: "tt10", day: "Friday", time: "09:00", endTime: "10:00", subject: "Database Management", subjectCode: "CS303", room: "Room 203", teacher: "Prof. Chen", batch: "CS-2022" },
  { id: "tt11", day: "Friday", time: "11:00", endTime: "12:00", subject: "Machine Learning", subjectCode: "CS306", room: "Room 305", teacher: "Dr. Lee", batch: "CS-2022" },
  { id: "tt12", day: "Saturday", time: "10:00", endTime: "11:30", subject: "Software Engineering", subjectCode: "CS305", room: "Lab 302", teacher: "Prof. Davis", batch: "CS-2022" },
];

const SEED_MIDMARKS: MidMark[] = [
  { id: "m1", studentId: "student-001", subjectCode: "CS301", subjectName: "Data Structures", midTerm1: 18, midTerm2: 22, maxMarks: 25 },
  { id: "m2", studentId: "student-001", subjectCode: "CS302", subjectName: "Operating Systems", midTerm1: 21, midTerm2: 20, maxMarks: 25 },
  { id: "m3", studentId: "student-001", subjectCode: "CS303", subjectName: "Database Management", midTerm1: 23, midTerm2: 24, maxMarks: 25 },
  { id: "m4", studentId: "student-001", subjectCode: "CS304", subjectName: "Computer Networks", midTerm1: 19, midTerm2: 21, maxMarks: 25 },
  { id: "m5", studentId: "student-001", subjectCode: "CS305", subjectName: "Software Engineering", midTerm1: 22, midTerm2: 23, maxMarks: 25 },
  { id: "m6", studentId: "student-001", subjectCode: "CS306", subjectName: "Machine Learning", midTerm1: 20, midTerm2: 19, maxMarks: 25 },
  { id: "m7", studentId: "student-002", subjectCode: "CS301", subjectName: "Data Structures", midTerm1: 20, midTerm2: 21, maxMarks: 25 },
  { id: "m8", studentId: "student-002", subjectCode: "CS302", subjectName: "Operating Systems", midTerm1: 18, midTerm2: 19, maxMarks: 25 },
];

const SEED_RESULTS: SemesterResult[] = [
  {
    id: "r1", studentId: "student-001", semester: 1, gpa: 3.7, grade: "A",
    subjects: [
      { code: "CS101", name: "Intro to CS", marks: 88, maxMarks: 100, grade: "A" },
      { code: "MA101", name: "Calculus I", marks: 79, maxMarks: 100, grade: "B+" },
      { code: "PH101", name: "Physics I", marks: 82, maxMarks: 100, grade: "A-" },
      { code: "EN101", name: "Technical Writing", marks: 91, maxMarks: 100, grade: "A" },
    ],
  },
  {
    id: "r2", studentId: "student-001", semester: 2, gpa: 3.85, grade: "A",
    subjects: [
      { code: "CS201", name: "Data Structures Basics", marks: 92, maxMarks: 100, grade: "A" },
      { code: "MA201", name: "Calculus II", marks: 85, maxMarks: 100, grade: "A-" },
      { code: "CS202", name: "Discrete Mathematics", marks: 88, maxMarks: 100, grade: "A" },
      { code: "CS203", name: "Digital Logic", marks: 90, maxMarks: 100, grade: "A" },
    ],
  },
];

const SEED_SYLLABUS: SyllabusItem[] = [
  { id: "s1", subjectCode: "CS301", subjectName: "Data Structures", description: "Advanced data structures and algorithm design", topics: ["Arrays & Linked Lists", "Trees & Graphs", "Sorting Algorithms", "Dynamic Programming", "Hashing"], credits: 4 },
  { id: "s2", subjectCode: "CS302", subjectName: "Operating Systems", description: "Principles of modern operating systems", topics: ["Process Management", "Memory Management", "File Systems", "Concurrency", "Virtual Memory"], credits: 4 },
  { id: "s3", subjectCode: "CS303", subjectName: "Database Management", description: "Relational databases and SQL", topics: ["Relational Model", "SQL Queries", "Normalization", "Transactions", "NoSQL Databases"], credits: 3 },
  { id: "s4", subjectCode: "CS304", subjectName: "Computer Networks", description: "Network protocols and architecture", topics: ["OSI Model", "TCP/IP Stack", "Routing Algorithms", "Network Security", "Wireless Networks"], credits: 3 },
  { id: "s5", subjectCode: "CS305", subjectName: "Software Engineering", description: "Software development methodologies", topics: ["SDLC Models", "Requirements Engineering", "UML Design", "Testing Strategies", "Agile & Scrum"], credits: 3 },
  { id: "s6", subjectCode: "CS306", subjectName: "Machine Learning", description: "Fundamentals of ML and AI", topics: ["Supervised Learning", "Neural Networks", "Model Evaluation", "Feature Engineering", "Deep Learning Intro"], credits: 4 },
];

const SEED_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "Mid-term Exam Schedule", body: "Mid-term examinations will be held from Nov 20-25. Check the timetable for your exam slots.", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), targetBatch: "All", sentBy: "admin-001", isRead: false },
  { id: "n2", title: "Semester Results Published", body: "Semester 2 results are now available. Login to view your grades and GPA.", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), targetBatch: "All", sentBy: "admin-001", isRead: false },
  { id: "n3", title: "Library Hours Extended", body: "The university library will remain open until 10 PM during exam week.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), targetBatch: "All", sentBy: "admin-001", isRead: true },
  { id: "n4", title: "CS Department Seminar", body: "Guest lecture on Cloud Computing by industry experts on Friday, 3 PM in Auditorium A.", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), targetBatch: "CS-2022", sentBy: "admin-001", isRead: true },
  { id: "n5", title: "Holiday Notice", body: "University will remain closed on Nov 15 (National Holiday). Classes resume Nov 16.", timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), targetBatch: "All", sentBy: "admin-001", isRead: true },
];

interface AppDataContextType {
  timetable: TimetableEntry[];
  midMarks: MidMark[];
  semesterResults: SemesterResult[];
  syllabus: SyllabusItem[];
  notifications: Notification[];
  addTimetableEntry: (entry: Omit<TimetableEntry, "id">) => Promise<void>;
  updateTimetableEntry: (entry: TimetableEntry) => Promise<void>;
  deleteTimetableEntry: (id: string) => Promise<void>;
  addMidMark: (mark: Omit<MidMark, "id">) => Promise<void>;
  addSemesterResult: (result: Omit<SemesterResult, "id">) => Promise<void>;
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "isRead">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  getStudentMidMarks: (studentId: string) => MidMark[];
  getStudentResults: (studentId: string) => SemesterResult[];
  getStudentNotifications: (batch: string) => Notification[];
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [midMarks, setMidMarks] = useState<MidMark[]>([]);
  const [semesterResults, setSemesterResults] = useState<SemesterResult[]>([]);
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [tt, mm, sr, sy, nn] = await Promise.all([
      AsyncStorage.getItem("timetable"),
      AsyncStorage.getItem("midmarks"),
      AsyncStorage.getItem("semester_results"),
      AsyncStorage.getItem("syllabus"),
      AsyncStorage.getItem("notifications"),
    ]);
    setTimetable(tt ? JSON.parse(tt) : SEED_TIMETABLE);
    setMidMarks(mm ? JSON.parse(mm) : SEED_MIDMARKS);
    setSemesterResults(sr ? JSON.parse(sr) : SEED_RESULTS);
    setSyllabus(sy ? JSON.parse(sy) : SEED_SYLLABUS);
    setNotifications(nn ? JSON.parse(nn) : SEED_NOTIFICATIONS);
    if (!tt) AsyncStorage.setItem("timetable", JSON.stringify(SEED_TIMETABLE));
    if (!mm) AsyncStorage.setItem("midmarks", JSON.stringify(SEED_MIDMARKS));
    if (!sr) AsyncStorage.setItem("semester_results", JSON.stringify(SEED_RESULTS));
    if (!sy) AsyncStorage.setItem("syllabus", JSON.stringify(SEED_SYLLABUS));
    if (!nn) AsyncStorage.setItem("notifications", JSON.stringify(SEED_NOTIFICATIONS));
  }

  async function addTimetableEntry(entry: Omit<TimetableEntry, "id">) {
    const newEntry = { ...entry, id: "tt" + Date.now() };
    const updated = [...timetable, newEntry];
    setTimetable(updated);
    await AsyncStorage.setItem("timetable", JSON.stringify(updated));
  }

  async function updateTimetableEntry(entry: TimetableEntry) {
    const updated = timetable.map((t) => (t.id === entry.id ? entry : t));
    setTimetable(updated);
    await AsyncStorage.setItem("timetable", JSON.stringify(updated));
  }

  async function deleteTimetableEntry(id: string) {
    const updated = timetable.filter((t) => t.id !== id);
    setTimetable(updated);
    await AsyncStorage.setItem("timetable", JSON.stringify(updated));
  }

  async function addMidMark(mark: Omit<MidMark, "id">) {
    const newMark = { ...mark, id: "m" + Date.now() };
    const updated = [...midMarks, newMark];
    setMidMarks(updated);
    await AsyncStorage.setItem("midmarks", JSON.stringify(updated));
  }

  async function addSemesterResult(result: Omit<SemesterResult, "id">) {
    const newResult = { ...result, id: "r" + Date.now() };
    const updated = [...semesterResults, newResult];
    setSemesterResults(updated);
    await AsyncStorage.setItem("semester_results", JSON.stringify(updated));
  }

  async function addNotification(n: Omit<Notification, "id" | "timestamp" | "isRead">) {
    const newN: Notification = { ...n, id: "n" + Date.now(), timestamp: new Date().toISOString(), isRead: false };
    const updated = [newN, ...notifications];
    setNotifications(updated);
    await AsyncStorage.setItem("notifications", JSON.stringify(updated));
  }

  async function markNotificationRead(id: string) {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    await AsyncStorage.setItem("notifications", JSON.stringify(updated));
  }

  const getStudentMidMarks = useCallback(
    (studentId: string) => midMarks.filter((m) => m.studentId === studentId),
    [midMarks]
  );

  const getStudentResults = useCallback(
    (studentId: string) => semesterResults.filter((r) => r.studentId === studentId),
    [semesterResults]
  );

  const getStudentNotifications = useCallback(
    (batch: string) =>
      notifications.filter((n) => n.targetBatch === "All" || n.targetBatch === batch),
    [notifications]
  );

  return (
    <AppDataContext.Provider
      value={{
        timetable,
        midMarks,
        semesterResults,
        syllabus,
        notifications,
        addTimetableEntry,
        updateTimetableEntry,
        deleteTimetableEntry,
        addMidMark,
        addSemesterResult,
        addNotification,
        markNotificationRead,
        getStudentMidMarks,
        getStudentResults,
        getStudentNotifications,
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
