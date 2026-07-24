import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getApiUrl } from "@/utils/api";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "student" | "admin" | "faculty";
  year: string;
  branch: string;
  section: string;
  rollNumber: string;
  hallTicketNumber: string;
  academicYear: string;
  enrollmentNo: string;
  batch: string;
  department: string;
  phone: string;
  profileImageUrl?: string;
  joinYear: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresPasswordChange?: boolean }>;
  logout: () => Promise<void>;
  register: (data: Omit<User, "id" | "role" | "batch" | "department">) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function postApi(path: string, body: unknown): Promise<{ success: boolean; user?: User; error?: string; requiresPasswordChange?: boolean }> {
  const response = await fetch(getApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { success: false, error: data.error ?? "Request failed" };
  return data;
}

async function putApi(path: string, body: unknown): Promise<{ success: boolean; user?: User; error?: string }> {
  const response = await fetch(getApiUrl(path), {
    method: "PUT",
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
      const stored = await AsyncStorage.getItem("current_user");
      if (stored) setUser(JSON.parse(stored));
    } catch (_) {
      await AsyncStorage.removeItem("current_user");
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      const result = await postApi("/api/auth/login", { email, password });
      if (!result.success || !result.user) {
        return { success: false, error: result.error ?? "Invalid email or password" };
      }
      await AsyncStorage.setItem("current_user", JSON.stringify(result.user));
      setUser(result.user);
      return { success: true, requiresPasswordChange: result.requiresPasswordChange ?? result.user.mustChangePassword ?? false };
    } catch (_) {
      return { success: false, error: "Could not connect to the server. Please try again." };
    }
  }

  async function logout() {
    await AsyncStorage.removeItem("current_user");
    setUser(null);
  }

  async function register(data: Omit<User, "id" | "role" | "batch" | "department">) {
    try {
      const result = await postApi("/api/auth/register", data);
      if (!result.success || !result.user) {
        return { success: false, error: result.error ?? "Registration failed" };
      }
      await AsyncStorage.setItem("current_user", JSON.stringify(result.user));
      setUser(result.user);
      return { success: true };
    } catch (_) {
      return { success: false, error: "Could not connect to the server. Please start the API and try again." };
    }
  }


  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user) return { success: false, error: "Please login first." };
    try {
      const result = await postApi("/api/auth/change-password", { userId: user.id, currentPassword, newPassword });
      if (!result.success || !result.user) {
        return { success: false, error: result.error ?? "Password change failed" };
      }
      await AsyncStorage.setItem("current_user", JSON.stringify(result.user));
      setUser(result.user);
      return { success: true };
    } catch (_) {
      return { success: false, error: "Could not connect to the server. Please try again." };
    }
  }

  async function updateProfile(data: Partial<User>) {
    if (!user) return;
    const result = await putApi("/api/data/users/" + user.id, { ...user, ...data });
    if (result.success && result.user) {
      await AsyncStorage.setItem("current_user", JSON.stringify(result.user));
      setUser(result.user);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
