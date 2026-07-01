import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { BRANCH_FULL } from "@/constants/academia";
import { getApiUrl } from "@/utils/api";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "student" | "admin";
  // Academic fields
  year: string;             // "1st" | "2nd" | "3rd" | "4th"
  branch: string;           // "CSE" | "CSM" | "CSIT" | "ECE" | "EEE" | "Mechanical" | "Civil" | "AIDS"
  section: string;          // "A" | "B" | "C" | "D"
  rollNumber: string;       // e.g. "22BCS0001"
  hallTicketNumber: string; // e.g. "22BCS0001" (used for exams)
  academicYear: string;     // e.g. "2024-25"
  // Display/legacy
  enrollmentNo: string;
  batch: string;            // auto-derived: "{year}-{branch}"
  department: string;       // full name of branch
  phone: string;            // Indian mobile: +91 XXXXX XXXXX
  joinYear: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: Omit<User, "id" | "role" | "batch" | "department">) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SEED_USERS: User[] = [
  {
    id: "admin-001",
    name: "Dr. Ramesh Kumar",
    email: "admin@university.edu",
    password: "admin123",
    role: "admin",
    year: "",
    branch: "",
    section: "",
    rollNumber: "ADM001",
    hallTicketNumber: "",
    academicYear: "2024-25",
    enrollmentNo: "ADM001",
    batch: "Admin",
    department: "Administration",
    phone: "+91 98765 43210",
    joinYear: "2015",
  },
  {
    id: "student-001",
    name: "Aarav Kumar",
    email: "student@university.edu",
    password: "student123",
    role: "student",
    year: "3rd",
    branch: "CSE",
    section: "A",
    rollNumber: "22BCS0001",
    hallTicketNumber: "22BCS0001",
    academicYear: "2024-25",
    enrollmentNo: "22BCS0001",
    batch: "3rd-CSE",
    department: "Computer Science & Engineering",
    phone: "+91 98765 11001",
    joinYear: "2022",
  },
  {
    id: "student-002",
    name: "Priya Sharma",
    email: "priya@university.edu",
    password: "student123",
    role: "student",
    year: "3rd",
    branch: "CSE",
    section: "B",
    rollNumber: "22BCS0002",
    hallTicketNumber: "22BCS0002",
    academicYear: "2024-25",
    enrollmentNo: "22BCS0002",
    batch: "3rd-CSE",
    department: "Computer Science & Engineering",
    phone: "+91 98765 11002",
    joinYear: "2022",
  },
  {
    id: "student-003",
    name: "Rahul Verma",
    email: "rahul@university.edu",
    password: "student123",
    role: "student",
    year: "2nd",
    branch: "ECE",
    section: "A",
    rollNumber: "23BEC0001",
    hallTicketNumber: "23BEC0001",
    academicYear: "2024-25",
    enrollmentNo: "23BEC0001",
    batch: "2nd-ECE",
    department: "Electronics & Communication Engineering",
    phone: "+91 98765 11003",
    joinYear: "2023",
  },
  {
    id: "student-004",
    name: "Anjali Singh",
    email: "anjali@university.edu",
    password: "student123",
    role: "student",
    year: "1st",
    branch: "CSM",
    section: "A",
    rollNumber: "24BCS0001",
    hallTicketNumber: "24BCS0001",
    academicYear: "2024-25",
    enrollmentNo: "24BCS0001",
    batch: "1st-CSM",
    department: "CS with AI & Machine Learning",
    phone: "+91 98765 11004",
    joinYear: "2024",
  },
];

const USERS_KEY = "users_v2";

async function apiRequest(path: string, body: unknown): Promise<{ success: boolean; user?: User; error?: string }> {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { success: false, error: data.error ?? "Request failed" };
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { bootstrap(); }, []);

  async function bootstrap() {
    try {
      const existing = await AsyncStorage.getItem(USERS_KEY);
      if (!existing) {
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
      } else {
        // Migrate: ensure hallTicketNumber and academicYear exist on all users
        const parsed: User[] = JSON.parse(existing);
        let changed = false;
        const migrated = parsed.map((u) => {
          const updates: Partial<User> = {};
          if (!u.hallTicketNumber) { updates.hallTicketNumber = u.rollNumber ?? u.enrollmentNo ?? ""; changed = true; }
          if (!u.academicYear)     { updates.academicYear = "2024-25"; changed = true; }
          return { ...u, ...updates };
        });
        if (changed) await AsyncStorage.setItem(USERS_KEY, JSON.stringify(migrated));
      }

      const stored = await AsyncStorage.getItem("current_user");
      if (stored) {
        const u: User = JSON.parse(stored);
        const patched: User = {
          ...u,
          hallTicketNumber: u.hallTicketNumber ?? u.rollNumber ?? "",
          academicYear:     u.academicYear     ?? "2024-25",
        };
        if (!u.hallTicketNumber || !u.academicYear) {
          await AsyncStorage.setItem("current_user", JSON.stringify(patched));
        }
        setUser(patched);
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const result = await apiRequest("/api/auth/login", { email, password });
      if (result.success && result.user) {
        await AsyncStorage.setItem("current_user", JSON.stringify(result.user));
        setUser(result.user);
        return { success: true };
      }
    } catch (_) {
      // Keep local demo login available when the API is offline.
    }

    const raw   = await AsyncStorage.getItem(USERS_KEY);
    const users: User[] = raw ? JSON.parse(raw) : SEED_USERS;
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { success: false, error: "Invalid email or password" };
    await AsyncStorage.setItem("current_user", JSON.stringify(found));
    setUser(found);
    return { success: true };
  }
  async function logout() {
    await AsyncStorage.removeItem("current_user");
    setUser(null);
  }

  async function register(data: Omit<User, "id" | "role" | "batch" | "department">) {
    const raw   = await AsyncStorage.getItem(USERS_KEY);
    const users: User[] = raw ? JSON.parse(raw) : SEED_USERS;
    const exists = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) return { success: false, error: "Email already registered" };

    try {
      const result = await apiRequest("/api/auth/register", data);
      if (!result.success) return { success: false, error: result.error };
      if (result.user) {
        users.push(result.user);
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
        await AsyncStorage.setItem("current_user", JSON.stringify(result.user));
        setUser(result.user);
        return { success: true };
      }
    } catch (_) {
      return { success: false, error: "Could not connect to the server. Please start the API and try again." };
    }

    return { success: false, error: "Registration failed" };
  }
  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...data };
    if (data.branch) updated.department = BRANCH_FULL[data.branch] ?? data.branch;
    if (data.year || data.branch) updated.batch = `${updated.year}-${updated.branch}`;
    const raw   = await AsyncStorage.getItem(USERS_KEY);
    const users: User[] = raw ? JSON.parse(raw) : [];
    const idx   = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) users[idx] = updated;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    await AsyncStorage.setItem("current_user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
