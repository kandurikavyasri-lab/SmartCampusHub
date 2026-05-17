import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { BRANCH_FULL } from "@/constants/academia";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "student" | "admin";
  // Academic fields
  year: string;        // "1st" | "2nd" | "3rd" | "4th"
  branch: string;      // "CSE" | "ECE" | "EEE" | "Civil" | "Mechanical" | "IT" | "AIDS"
  section: string;     // "A" | "B" | "C" | "D"
  rollNumber: string;
  // Legacy / display
  enrollmentNo: string;
  batch: string;       // auto-derived: "{year}-{branch}"
  department: string;  // full name of branch
  phone: string;
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
    name: "Dr. Sarah Johnson",
    email: "admin@university.edu",
    password: "admin123",
    role: "admin",
    year: "",
    branch: "",
    section: "",
    rollNumber: "ADM001",
    enrollmentNo: "ADM001",
    batch: "Admin",
    department: "Administration",
    phone: "+1 555-0100",
    joinYear: "2018",
  },
  {
    id: "student-001",
    name: "Alex Kumar",
    email: "student@university.edu",
    password: "student123",
    role: "student",
    year: "3rd",
    branch: "CSE",
    section: "A",
    rollNumber: "CS20001",
    enrollmentNo: "CS2022001",
    batch: "3rd-CSE",
    department: "Computer Science & Engineering",
    phone: "+1 555-0201",
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
    rollNumber: "CS20002",
    enrollmentNo: "CS2022002",
    batch: "3rd-CSE",
    department: "Computer Science & Engineering",
    phone: "+1 555-0202",
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
    rollNumber: "EC21001",
    enrollmentNo: "EC2023001",
    batch: "2nd-ECE",
    department: "Electronics & Communication",
    phone: "+1 555-0203",
    joinYear: "2023",
  },
  {
    id: "student-004",
    name: "Anjali Singh",
    email: "anjali@university.edu",
    password: "student123",
    role: "student",
    year: "1st",
    branch: "IT",
    section: "A",
    rollNumber: "IT24001",
    enrollmentNo: "IT2024001",
    batch: "1st-IT",
    department: "Information Technology",
    phone: "+1 555-0204",
    joinYear: "2024",
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { bootstrap(); }, []);

  async function bootstrap() {
    try {
      const existing = await AsyncStorage.getItem("users");
      if (!existing) {
        await AsyncStorage.setItem("users", JSON.stringify(SEED_USERS));
      } else {
        // Migrate old users that don't have year/branch/section
        const parsed: User[] = JSON.parse(existing);
        let changed = false;
        const migrated = parsed.map((u) => {
          if (u.role === "student" && !u.year) {
            changed = true;
            return { ...u, year: "3rd", branch: "CSE", section: "A", rollNumber: u.enrollmentNo ?? "" };
          }
          return u;
        });
        if (changed) await AsyncStorage.setItem("users", JSON.stringify(migrated));
      }
      const stored = await AsyncStorage.getItem("current_user");
      if (stored) {
        const u: User = JSON.parse(stored);
        // Migrate stored user
        if (u.role === "student" && !u.year) {
          const migrated = { ...u, year: "3rd", branch: "CSE", section: "A", rollNumber: u.enrollmentNo ?? "" };
          await AsyncStorage.setItem("current_user", JSON.stringify(migrated));
          setUser(migrated);
        } else {
          setUser(u);
        }
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const raw = await AsyncStorage.getItem("users");
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
    const raw = await AsyncStorage.getItem("users");
    const users: User[] = raw ? JSON.parse(raw) : SEED_USERS;
    const exists = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) return { success: false, error: "Email already registered" };
    const newUser: User = {
      ...data,
      id: "student-" + Date.now().toString(),
      role: "student",
      batch: `${data.year}-${data.branch}`,
      department: BRANCH_FULL[data.branch] ?? data.branch,
    };
    users.push(newUser);
    await AsyncStorage.setItem("users", JSON.stringify(users));
    await AsyncStorage.setItem("current_user", JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }

  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...data };
    if (data.branch) updated.department = BRANCH_FULL[data.branch] ?? data.branch;
    if (data.year || data.branch) updated.batch = `${updated.year}-${updated.branch}`;
    const raw = await AsyncStorage.getItem("users");
    const users: User[] = raw ? JSON.parse(raw) : [];
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) users[idx] = updated;
    await AsyncStorage.setItem("users", JSON.stringify(users));
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
