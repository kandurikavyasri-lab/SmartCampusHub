import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "student" | "admin";
  enrollmentNo: string;
  batch: string;
  department: string;
  phone: string;
  joinYear: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: Omit<User, "id" | "role">) => Promise<{ success: boolean; error?: string }>;
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
    enrollmentNo: "ADM001",
    batch: "All",
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
    enrollmentNo: "CS2022001",
    batch: "CS-2022",
    department: "Computer Science",
    phone: "+1 555-0201",
    joinYear: "2022",
  },
  {
    id: "student-002",
    name: "Priya Sharma",
    email: "priya@university.edu",
    password: "student123",
    role: "student",
    enrollmentNo: "CS2022002",
    batch: "CS-2022",
    department: "Computer Science",
    phone: "+1 555-0202",
    joinYear: "2022",
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const existing = await AsyncStorage.getItem("users");
      if (!existing) {
        await AsyncStorage.setItem("users", JSON.stringify(SEED_USERS));
      }
      const stored = await AsyncStorage.getItem("current_user");
      if (stored) {
        setUser(JSON.parse(stored));
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

  async function register(data: Omit<User, "id" | "role">) {
    const raw = await AsyncStorage.getItem("users");
    const users: User[] = raw ? JSON.parse(raw) : SEED_USERS;
    const exists = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) return { success: false, error: "Email already registered" };
    const newUser: User = {
      ...data,
      id: "student-" + Date.now().toString(),
      role: "student",
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
