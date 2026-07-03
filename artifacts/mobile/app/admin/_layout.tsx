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
        headerShadowVisible: true,
        headerBackTitle: "Back",
        headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 18 },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admin Panel", headerShown: false }} />
      <Stack.Screen name="results" options={{ title: "Upload Results" }} />
      <Stack.Screen name="subjects" options={{ title: "Subjects" }} />
      <Stack.Screen name="feed" options={{ title: "Feed Management", headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: "Profile", headerShown: false }} />
      <Stack.Screen name="feed-controls" options={{ title: "Feed Controls", headerShown: false }} />
      <Stack.Screen name="feed-compose" options={{ title: "Create Post", headerShown: false }} />
      <Stack.Screen name="students" options={{ title: "Manage Students" }} />
      <Stack.Screen name="timetable" options={{ title: "Update Timetable" }} />
      <Stack.Screen name="send-notification" options={{ title: "Send Notification" }} />
      <Stack.Screen name="notification-controls" options={{ title: "Notifications", headerShown: false }} />
      <Stack.Screen name="bulk-upload" options={{ title: "Bulk Upload" }} />
    </Stack>
  );
}
