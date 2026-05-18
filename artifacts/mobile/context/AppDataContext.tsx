import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { NotifCategory } from "@/constants/academia";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimetableEntry {
  id: string;
  day: string;
  time: string;      // HH:MM (24-hour)
  endTime: string;   // HH:MM (24-hour)
  subject: string;
  subjectCode: string;
  room: string;
  teacher: string;
  year: string;    // "1st" | "2nd" | "3rd" | "4th" | "All"
  branch: string;  // "CSE" | "ECE" | ... | "All"
  section: string; // "A" | "B" | "C" | "D" | "All"
  batch: string;
}

export interface MidMark {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  // Internal assessment (out of 25 each)
  midTerm1: number;  // Mid-1 marks (out of maxMarks)
  midTerm2: number;  // Mid-2 marks (out of maxMarks)
  maxMarks: number;  // Max per mid-term (default 25)
  // External exam (out of 75, optional — filled after university exam)
  externalMarks?: number;
  maxExternal?: number; // default 75
}

export interface SubjectResult {
  code: string;
  name: string;
  internalMarks: number;  // out of 25
  externalMarks: number;  // out of 75
  totalMarks: number;     // out of 100
  maxMarks: number;       // 100
  grade: string;          // O / A+ / A / B+ / B / C / P / F
  gradePoints: number;    // 10-point scale
  credits: number;
}

export interface SemesterResult {
  id: string;
  studentId: string;
  semester: number;
  sgpa: number;   // Semester Grade Point Average (10-point scale)
  cgpa: number;   // Cumulative GPA (calculated at time of upload)
  grade: string;  // Overall grade for semester
  subjects: SubjectResult[];
  // Legacy compat
  gpa?: number;
}

export interface SyllabusItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  description: string;
  topics: string[];
  credits: number;
  year: string;   // "1st" | "2nd" | "3rd" | "4th" | "All"
  branch: string; // "CSE" | ... | "All"
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  category: NotifCategory;
  targetYear: string;   // "All" | "1st" | "2nd" | "3rd" | "4th"
  targetBranch: string; // "All" | "CSE" | "ECE" | ...
  targetBatch: string;
  sentBy: string;
  isRead: boolean;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_TIMETABLE: TimetableEntry[] = [
  // 3rd Year CSE Section A — Semester 5
  { id: "tt1",  day: "Monday",    time: "09:00", endTime: "10:00", subject: "Data Structures & Algorithms",   subjectCode: "CS501", room: "CR-201",  teacher: "Dr. Suresh Reddy",   year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt2",  day: "Monday",    time: "10:00", endTime: "11:00", subject: "Operating Systems",               subjectCode: "CS502", room: "CR-105", teacher: "Prof. Kavitha Menon", year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt3",  day: "Monday",    time: "14:00", endTime: "16:00", subject: "DBMS Lab",                       subjectCode: "CS503L",room: "Lab-301", teacher: "Dr. Anita Nair",     year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt4",  day: "Tuesday",   time: "09:00", endTime: "10:00", subject: "Database Management Systems",    subjectCode: "CS503", room: "CR-203", teacher: "Dr. Anita Nair",     year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt5",  day: "Tuesday",   time: "10:00", endTime: "11:00", subject: "Computer Networks",              subjectCode: "CS504", room: "CR-107", teacher: "Prof. Rajan Sharma",  year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt6",  day: "Tuesday",   time: "14:00", endTime: "15:00", subject: "Software Engineering",           subjectCode: "CS505", room: "CR-302", teacher: "Dr. Priya Iyer",     year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt7",  day: "Wednesday", time: "09:00", endTime: "10:00", subject: "Data Structures & Algorithms",   subjectCode: "CS501", room: "CR-201",  teacher: "Dr. Suresh Reddy",   year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt8",  day: "Wednesday", time: "11:00", endTime: "13:00", subject: "Networks Lab",                   subjectCode: "CS504L",room: "Lab-402", teacher: "Prof. Rajan Sharma",  year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt9",  day: "Thursday",  time: "09:00", endTime: "10:00", subject: "Machine Learning",               subjectCode: "CS506", room: "CR-305", teacher: "Dr. Venkat Rao",     year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt10", day: "Thursday",  time: "10:00", endTime: "11:00", subject: "Operating Systems",               subjectCode: "CS502", room: "Lab-201", teacher: "Prof. Kavitha Menon", year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt11", day: "Friday",    time: "09:00", endTime: "10:00", subject: "Database Management Systems",    subjectCode: "CS503", room: "CR-203", teacher: "Dr. Anita Nair",     year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt12", day: "Friday",    time: "10:00", endTime: "11:00", subject: "Machine Learning",               subjectCode: "CS506", room: "CR-305", teacher: "Dr. Venkat Rao",     year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt13", day: "Saturday",  time: "09:00", endTime: "10:00", subject: "Software Engineering",           subjectCode: "CS505", room: "CR-302", teacher: "Dr. Priya Iyer",     year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  { id: "tt14", day: "Saturday",  time: "10:00", endTime: "11:00", subject: "Computer Networks",              subjectCode: "CS504", room: "CR-107", teacher: "Prof. Rajan Sharma",  year: "3rd", branch: "CSE", section: "A", batch: "3rd-CSE" },
  // 3rd Year CSE Section B
  { id: "tt15", day: "Monday",    time: "10:00", endTime: "11:00", subject: "Data Structures & Algorithms",   subjectCode: "CS501", room: "CR-202",  teacher: "Dr. Suresh Reddy",   year: "3rd", branch: "CSE", section: "B", batch: "3rd-CSE" },
  { id: "tt16", day: "Monday",    time: "13:00", endTime: "14:00", subject: "Operating Systems",               subjectCode: "CS502", room: "CR-108", teacher: "Prof. Kavitha Menon", year: "3rd", branch: "CSE", section: "B", batch: "3rd-CSE" },
  // 2nd Year ECE Section A — Semester 3
  { id: "tt17", day: "Monday",    time: "09:00", endTime: "10:00", subject: "Signals & Systems",              subjectCode: "EC301", room: "CR-301", teacher: "Dr. Srinivas Murthy", year: "2nd", branch: "ECE", section: "A", batch: "2nd-ECE" },
  { id: "tt18", day: "Monday",    time: "11:00", endTime: "12:00", subject: "Digital Electronics",            subjectCode: "EC302", room: "Lab-401", teacher: "Prof. Meena Pillai",  year: "2nd", branch: "ECE", section: "A", batch: "2nd-ECE" },
  { id: "tt19", day: "Tuesday",   time: "09:00", endTime: "10:30", subject: "Electromagnetic Theory",         subjectCode: "EC303", room: "CR-302", teacher: "Dr. Karthik Rao",    year: "2nd", branch: "ECE", section: "A", batch: "2nd-ECE" },
  { id: "tt20", day: "Wednesday", time: "10:00", endTime: "11:00", subject: "Signals & Systems",              subjectCode: "EC301", room: "CR-301", teacher: "Dr. Srinivas Murthy", year: "2nd", branch: "ECE", section: "A", batch: "2nd-ECE" },
  // 1st Year CSM Section A — Semester 1
  { id: "tt21", day: "Monday",    time: "09:00", endTime: "10:00", subject: "Engineering Mathematics – I",    subjectCode: "MA101", room: "CR-101", teacher: "Dr. Lakshmi Gupta",  year: "1st", branch: "CSM", section: "A", batch: "1st-CSM" },
  { id: "tt22", day: "Monday",    time: "11:00", endTime: "12:00", subject: "Programming in C",               subjectCode: "CS101", room: "Lab-101", teacher: "Prof. Arun Verma",   year: "1st", branch: "CSM", section: "A", batch: "1st-CSM" },
  { id: "tt23", day: "Tuesday",   time: "10:00", endTime: "11:00", subject: "Engineering Physics",            subjectCode: "PH101", room: "CR-102", teacher: "Dr. Nisha Singh",    year: "1st", branch: "CSM", section: "A", batch: "1st-CSM" },
];

const SEED_MIDMARKS: MidMark[] = [
  // 3rd Year CSE — student-001 (Aarav Kumar) — Semester 5
  { id: "m1",  studentId: "student-001", subjectCode: "CS501", subjectName: "Data Structures & Algorithms",  midTerm1: 22, midTerm2: 23, maxMarks: 25 },
  { id: "m2",  studentId: "student-001", subjectCode: "CS502", subjectName: "Operating Systems",             midTerm1: 19, midTerm2: 21, maxMarks: 25 },
  { id: "m3",  studentId: "student-001", subjectCode: "CS503", subjectName: "Database Management Systems",   midTerm1: 24, midTerm2: 25, maxMarks: 25 },
  { id: "m4",  studentId: "student-001", subjectCode: "CS504", subjectName: "Computer Networks",             midTerm1: 20, midTerm2: 22, maxMarks: 25 },
  { id: "m5",  studentId: "student-001", subjectCode: "CS505", subjectName: "Software Engineering",          midTerm1: 21, midTerm2: 23, maxMarks: 25 },
  { id: "m6",  studentId: "student-001", subjectCode: "CS506", subjectName: "Machine Learning",              midTerm1: 18, midTerm2: 20, maxMarks: 25 },
  // student-002 (Priya Sharma)
  { id: "m7",  studentId: "student-002", subjectCode: "CS501", subjectName: "Data Structures & Algorithms",  midTerm1: 23, midTerm2: 24, maxMarks: 25 },
  { id: "m8",  studentId: "student-002", subjectCode: "CS502", subjectName: "Operating Systems",             midTerm1: 20, midTerm2: 22, maxMarks: 25 },
  // student-003 (Rahul Verma) — 2nd Year ECE
  { id: "m9",  studentId: "student-003", subjectCode: "EC301", subjectName: "Signals & Systems",             midTerm1: 20, midTerm2: 21, maxMarks: 25 },
  { id: "m10", studentId: "student-003", subjectCode: "EC302", subjectName: "Digital Electronics",           midTerm1: 22, midTerm2: 23, maxMarks: 25 },
];

const SEED_RESULTS: SemesterResult[] = [
  {
    id: "r1", studentId: "student-001", semester: 1, sgpa: 8.50, cgpa: 8.50, grade: "A",
    subjects: [
      { code: "MA101", name: "Engineering Mathematics – I", internalMarks: 22, externalMarks: 65, totalMarks: 87, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 4 },
      { code: "PH101", name: "Engineering Physics",          internalMarks: 20, externalMarks: 62, totalMarks: 82, maxMarks: 100, grade: "A",  gradePoints: 8, credits: 4 },
      { code: "CS101", name: "Programming in C",             internalMarks: 24, externalMarks: 68, totalMarks: 92, maxMarks: 100, grade: "O",  gradePoints: 10, credits: 3 },
      { code: "EN101", name: "Technical English",            internalMarks: 21, externalMarks: 60, totalMarks: 81, maxMarks: 100, grade: "A",  gradePoints: 8, credits: 2 },
      { code: "EG101", name: "Engineering Graphics",         internalMarks: 23, externalMarks: 58, totalMarks: 81, maxMarks: 100, grade: "A",  gradePoints: 8, credits: 2 },
    ],
    gpa: 8.50,
  },
  {
    id: "r2", studentId: "student-001", semester: 2, sgpa: 8.75, cgpa: 8.63, grade: "A+",
    subjects: [
      { code: "MA201", name: "Engineering Mathematics – II", internalMarks: 23, externalMarks: 66, totalMarks: 89, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 4 },
      { code: "EC201", name: "Basic Electronics",            internalMarks: 20, externalMarks: 60, totalMarks: 80, maxMarks: 100, grade: "A",  gradePoints: 8, credits: 3 },
      { code: "CS201", name: "Data Structures",              internalMarks: 24, externalMarks: 70, totalMarks: 94, maxMarks: 100, grade: "O",  gradePoints: 10, credits: 4 },
      { code: "CS202", name: "Discrete Mathematics",         internalMarks: 22, externalMarks: 64, totalMarks: 86, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 3 },
      { code: "CS203", name: "Digital Logic Design",         internalMarks: 21, externalMarks: 66, totalMarks: 87, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 3 },
    ],
    gpa: 8.75,
  },
  {
    id: "r3", studentId: "student-001", semester: 3, sgpa: 8.60, cgpa: 8.62, grade: "A+",
    subjects: [
      { code: "MA301", name: "Probability & Statistics",     internalMarks: 20, externalMarks: 62, totalMarks: 82, maxMarks: 100, grade: "A",  gradePoints: 8, credits: 3 },
      { code: "CS301", name: "OOP with Java",                internalMarks: 24, externalMarks: 68, totalMarks: 92, maxMarks: 100, grade: "O",  gradePoints: 10, credits: 4 },
      { code: "CS302", name: "Computer Organisation",        internalMarks: 21, externalMarks: 63, totalMarks: 84, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 4 },
      { code: "CS303", name: "Design & Analysis of Algorithms", internalMarks: 22, externalMarks: 65, totalMarks: 87, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 4 },
      { code: "CS304", name: "Computer Architecture",        internalMarks: 20, externalMarks: 60, totalMarks: 80, maxMarks: 100, grade: "A",  gradePoints: 8, credits: 3 },
    ],
    gpa: 8.60,
  },
  {
    id: "r4", studentId: "student-001", semester: 4, sgpa: 8.80, cgpa: 8.66, grade: "A+",
    subjects: [
      { code: "CS401", name: "Operating Systems",            internalMarks: 23, externalMarks: 67, totalMarks: 90, maxMarks: 100, grade: "O",  gradePoints: 10, credits: 4 },
      { code: "CS402", name: "Database Management Systems",  internalMarks: 24, externalMarks: 70, totalMarks: 94, maxMarks: 100, grade: "O",  gradePoints: 10, credits: 4 },
      { code: "CS403", name: "Theory of Computation",        internalMarks: 20, externalMarks: 62, totalMarks: 82, maxMarks: 100, grade: "A",  gradePoints: 8, credits: 3 },
      { code: "CS404", name: "Web Technologies",             internalMarks: 22, externalMarks: 64, totalMarks: 86, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 3 },
      { code: "CS405", name: "Software Engineering",         internalMarks: 21, externalMarks: 63, totalMarks: 84, maxMarks: 100, grade: "A+", gradePoints: 9, credits: 3 },
    ],
    gpa: 8.80,
  },
];

const SEED_SYLLABUS: SyllabusItem[] = [
  { id: "s1",  subjectCode: "CS501", subjectName: "Data Structures & Algorithms",  description: "Advanced data structures and algorithm design techniques", topics: ["Arrays & Linked Lists", "Trees & Graphs", "Sorting & Searching", "Dynamic Programming", "Greedy Algorithms", "NP-Completeness"], credits: 4, year: "3rd", branch: "CSE" },
  { id: "s2",  subjectCode: "CS502", subjectName: "Operating Systems",              description: "Principles and design of modern operating systems",         topics: ["Process Management", "Memory Management", "File Systems", "I/O Systems", "Concurrency & Deadlocks", "Virtual Memory"],  credits: 4, year: "3rd", branch: "CSE" },
  { id: "s3",  subjectCode: "CS503", subjectName: "Database Management Systems",    description: "Relational model, SQL, and database design",               topics: ["Relational Model", "SQL & PL/SQL", "Normalization", "Transaction Management", "Indexing", "NoSQL Databases"],            credits: 3, year: "3rd", branch: "CSE" },
  { id: "s4",  subjectCode: "CS504", subjectName: "Computer Networks",              description: "Network protocols, architecture, and security",            topics: ["OSI & TCP/IP Model", "Network Devices", "Routing Algorithms", "Transport Layer", "Network Security", "Wireless LAN"],   credits: 3, year: "3rd", branch: "CSE" },
  { id: "s5",  subjectCode: "CS505", subjectName: "Software Engineering",           description: "Software development methodologies and quality practices", topics: ["SDLC Models", "Requirement Engineering", "UML & Design Patterns", "Testing Strategies", "Agile & Scrum", "DevOps"], credits: 3, year: "3rd", branch: "CSE" },
  { id: "s6",  subjectCode: "CS506", subjectName: "Machine Learning",               description: "Fundamentals of machine learning and AI",                  topics: ["Supervised Learning", "Unsupervised Learning", "Neural Networks", "Feature Engineering", "Model Evaluation", "CNN & RNN"], credits: 4, year: "3rd", branch: "CSE" },
  { id: "s7",  subjectCode: "EC301", subjectName: "Signals & Systems",              description: "Continuous and discrete-time signal analysis",             topics: ["Signal Classification", "Fourier Series", "Laplace Transform", "Z-Transform", "Sampling Theorem", "System Response"], credits: 4, year: "2nd", branch: "ECE" },
  { id: "s8",  subjectCode: "EC302", subjectName: "Digital Electronics",            description: "Logic gates, circuits and microprocessors",                topics: ["Boolean Algebra", "Combinational Circuits", "Sequential Circuits", "Flip-Flops", "Counters & Registers", "ADC/DAC"],    credits: 4, year: "2nd", branch: "ECE" },
  { id: "s9",  subjectCode: "EC303", subjectName: "Electromagnetic Theory",         description: "Electromagnetic field theory and wave propagation",        topics: ["Maxwell Equations", "Electric Fields", "Magnetic Fields", "Wave Propagation", "Transmission Lines", "Antennas"],        credits: 3, year: "2nd", branch: "ECE" },
  { id: "s10", subjectCode: "MA101", subjectName: "Engineering Mathematics – I",    description: "Fundamentals of engineering mathematics",                  topics: ["Differential Calculus", "Integral Calculus", "Differential Equations", "Linear Algebra", "Laplace Transforms"],       credits: 4, year: "1st", branch: "All" },
  { id: "s11", subjectCode: "CS101", subjectName: "Programming in C",               description: "Programming basics using C language",                     topics: ["Variables & Data Types", "Control Flow", "Functions", "Arrays & Pointers", "Structures", "File Handling"],              credits: 3, year: "1st", branch: "CSM" },
];

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: "n1", category: "exam",
    title: "Mid-1 Examination Schedule – Nov 2024",
    body: "Mid-1 examinations will be conducted from 18/11/2024 to 23/11/2024. Hall tickets can be downloaded from 15/11/2024. Reporting time: 09:00. Carry your Hall Ticket and college ID.",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    targetYear: "All", targetBranch: "All", targetBatch: "All", sentBy: "admin-001", isRead: false,
  },
  {
    id: "n2", category: "result",
    title: "Semester 3 Results Declared",
    body: "Results of Semester 3 (Academic Year 2023-24) have been published. Log in to view your SGPA, CGPA, and subject-wise marks. Detailed marksheets available at the Examination Section.",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    targetYear: "All", targetBranch: "All", targetBatch: "All", sentBy: "admin-001", isRead: false,
  },
  {
    id: "n3", category: "holiday",
    title: "Holiday Notice – Diwali Vacation",
    body: "The college will remain closed from 30/10/2024 (Wednesday) to 05/11/2024 (Tuesday) on account of Diwali vacation. Classes resume on 06/11/2024. Happy Diwali!",
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    targetYear: "All", targetBranch: "All", targetBatch: "All", sentBy: "admin-001", isRead: true,
  },
  {
    id: "n4", category: "general",
    title: "Guest Lecture – Cloud Computing & DevOps",
    body: "A guest lecture by Mr. Rajesh Narayanan (Senior Engineer, TCS) on Cloud Computing and DevOps practices will be held on 22/11/2024 at 14:00 in Seminar Hall A. Attendance is mandatory for 3rd Year CSE students.",
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    targetYear: "3rd", targetBranch: "CSE", targetBatch: "3rd-CSE", sentBy: "admin-001", isRead: true,
  },
  {
    id: "n5", category: "timetable",
    title: "Lab Rescheduling – Digital Electronics Lab",
    body: "Digital Electronics Lab for 2nd Year ECE Section A has been rescheduled from Friday to Thursday (14:00–16:00), effective from 11/11/2024. Venue changed to Lab-402. Contact Dr. Srinivas Murthy for queries.",
    timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
    targetYear: "2nd", targetBranch: "ECE", targetBatch: "2nd-ECE", sentBy: "admin-001", isRead: true,
  },
  {
    id: "n6", category: "supply",
    title: "Supplementary Examination – Oct 2024",
    body: "Supplementary (Back-log) examinations for Academic Year 2023-24 are scheduled from 14/10/2024 to 25/10/2024. Students with arrear subjects must apply before 05/10/2024. Fee: ₹500 per subject. Apply at the Examination Section.",
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    targetYear: "All", targetBranch: "All", targetBatch: "All", sentBy: "admin-001", isRead: true,
  },
  {
    id: "n7", category: "general",
    title: "Fee Payment – Last Date Extended",
    body: "The last date for payment of Semester 5 examination fee (₹850) has been extended to 30/11/2024. Pay online via the student portal or at the Accounts Office (09:00–15:00 on working days). Late fee ₹100 per day applies after the due date.",
    timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
    targetYear: "3rd", targetBranch: "All", targetBatch: "All", sentBy: "admin-001", isRead: true,
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppDataContextType {
  timetable: TimetableEntry[];
  midMarks: MidMark[];
  semesterResults: SemesterResult[];
  syllabus: SyllabusItem[];
  notifications: Notification[];
  addTimetableEntry:    (entry: Omit<TimetableEntry, "id">) => Promise<void>;
  updateTimetableEntry: (entry: TimetableEntry) => Promise<void>;
  deleteTimetableEntry: (id: string) => Promise<void>;
  addMidMark:           (mark: Omit<MidMark, "id">) => Promise<void>;
  addSemesterResult:    (result: Omit<SemesterResult, "id">) => Promise<void>;
  addNotification:      (n: Omit<Notification, "id" | "timestamp" | "isRead">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  getStudentMidMarks:       (studentId: string) => MidMark[];
  getStudentResults:        (studentId: string) => SemesterResult[];
  getStudentTimetable:      (year: string, branch: string, section: string) => TimetableEntry[];
  getStudentNotifications:  (year: string, branch: string) => Notification[];
  getStudentSyllabus:       (year: string, branch: string) => SyllabusItem[];
}

const AppDataContext = createContext<AppDataContextType | null>(null);

const TT_KEY  = "timetable_v3";
const MM_KEY  = "midmarks_v3";
const SR_KEY  = "semester_results_v3";
const SY_KEY  = "syllabus_v3";
const NN_KEY  = "notifications_v3";

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [timetable,        setTimetable]        = useState<TimetableEntry[]>([]);
  const [midMarks,         setMidMarks]         = useState<MidMark[]>([]);
  const [semesterResults,  setSemesterResults]  = useState<SemesterResult[]>([]);
  const [syllabus,         setSyllabus]         = useState<SyllabusItem[]>([]);
  const [notifications,    setNotifications]    = useState<Notification[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [tt, mm, sr, sy, nn] = await Promise.all([
      AsyncStorage.getItem(TT_KEY),
      AsyncStorage.getItem(MM_KEY),
      AsyncStorage.getItem(SR_KEY),
      AsyncStorage.getItem(SY_KEY),
      AsyncStorage.getItem(NN_KEY),
    ]);
    setTimetable(tt          ? JSON.parse(tt) : SEED_TIMETABLE);
    setMidMarks(mm           ? JSON.parse(mm) : SEED_MIDMARKS);
    setSemesterResults(sr    ? JSON.parse(sr) : SEED_RESULTS);
    setSyllabus(sy           ? JSON.parse(sy) : SEED_SYLLABUS);
    setNotifications(nn      ? JSON.parse(nn) : SEED_NOTIFICATIONS);
    if (!tt) AsyncStorage.setItem(TT_KEY, JSON.stringify(SEED_TIMETABLE));
    if (!mm) AsyncStorage.setItem(MM_KEY, JSON.stringify(SEED_MIDMARKS));
    if (!sr) AsyncStorage.setItem(SR_KEY, JSON.stringify(SEED_RESULTS));
    if (!sy) AsyncStorage.setItem(SY_KEY, JSON.stringify(SEED_SYLLABUS));
    if (!nn) AsyncStorage.setItem(NN_KEY, JSON.stringify(SEED_NOTIFICATIONS));
  }

  async function addTimetableEntry(entry: Omit<TimetableEntry, "id">) {
    const newEntry = { ...entry, id: "tt" + Date.now() };
    const updated = [...timetable, newEntry];
    setTimetable(updated);
    await AsyncStorage.setItem(TT_KEY, JSON.stringify(updated));
  }

  async function updateTimetableEntry(entry: TimetableEntry) {
    const updated = timetable.map((t) => (t.id === entry.id ? entry : t));
    setTimetable(updated);
    await AsyncStorage.setItem(TT_KEY, JSON.stringify(updated));
  }

  async function deleteTimetableEntry(id: string) {
    const updated = timetable.filter((t) => t.id !== id);
    setTimetable(updated);
    await AsyncStorage.setItem(TT_KEY, JSON.stringify(updated));
  }

  async function addMidMark(mark: Omit<MidMark, "id">) {
    const newMark = { ...mark, id: "m" + Date.now() };
    const updated = [...midMarks, newMark];
    setMidMarks(updated);
    await AsyncStorage.setItem(MM_KEY, JSON.stringify(updated));
  }

  async function addSemesterResult(result: Omit<SemesterResult, "id">) {
    const newResult = { ...result, id: "r" + Date.now() };
    const updated   = [...semesterResults, newResult];
    setSemesterResults(updated);
    await AsyncStorage.setItem(SR_KEY, JSON.stringify(updated));
  }

  async function addNotification(n: Omit<Notification, "id" | "timestamp" | "isRead">) {
    const newN: Notification = {
      ...n,
      id:        "n" + Date.now(),
      timestamp: new Date().toISOString(),
      isRead:    false,
    };
    const updated = [newN, ...notifications];
    setNotifications(updated);
    await AsyncStorage.setItem(NN_KEY, JSON.stringify(updated));
  }

  async function markNotificationRead(id: string) {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    await AsyncStorage.setItem(NN_KEY, JSON.stringify(updated));
  }

  const getStudentMidMarks = useCallback(
    (studentId: string) => midMarks.filter((m) => m.studentId === studentId),
    [midMarks]
  );

  const getStudentResults = useCallback(
    (studentId: string) => semesterResults.filter((r) => r.studentId === studentId),
    [semesterResults]
  );

  const getStudentTimetable = useCallback(
    (year: string, branch: string, section: string) =>
      timetable.filter((t) => {
        const yMatch = !t.year    || t.year    === "All" || t.year    === year;
        const bMatch = !t.branch  || t.branch  === "All" || t.branch  === branch;
        const sMatch = !t.section || t.section === "All" || t.section === section;
        return yMatch && bMatch && sMatch;
      }),
    [timetable]
  );

  const getStudentNotifications = useCallback(
    (year: string, branch: string) =>
      notifications.filter((n) => {
        const yMatch = !n.targetYear   || n.targetYear   === "All" || n.targetYear   === year;
        const bMatch = !n.targetBranch || n.targetBranch === "All" || n.targetBranch === branch;
        return yMatch && bMatch;
      }),
    [notifications]
  );

  const getStudentSyllabus = useCallback(
    (year: string, branch: string) =>
      syllabus.filter((s) => {
        const yMatch = !s.year   || s.year   === "All" || s.year   === year;
        const bMatch = !s.branch || s.branch === "All" || s.branch === branch;
        return yMatch && bMatch;
      }),
    [syllabus]
  );

  return (
    <AppDataContext.Provider
      value={{
        timetable, midMarks, semesterResults, syllabus, notifications,
        addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
        addMidMark, addSemesterResult, addNotification, markNotificationRead,
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
