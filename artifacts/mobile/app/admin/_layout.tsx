import { Redirect, Stack } from "expo-router";
import React from "react";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function AdminLayout() {
  const { user } = useAuth();
  const colors = useColors();

  if (!user || user.role !== "admin") {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admin Panel", headerShown: false }} />
      <Stack.Screen name="results" options={{ title: "Upload Results" }} />
      <Stack.Screen name="students" options={{ title: "Manage Students" }} />
      <Stack.Screen name="timetable" options={{ title: "Update Timetable" }} />
      <Stack.Screen name="send-notification" options={{ title: "Send Notification" }} />
    </Stack>
  );
}
