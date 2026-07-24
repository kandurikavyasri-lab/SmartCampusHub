import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

type Feature = {
  code: string;
  title: string;
  subtitle: string;
  category: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  audience: string;
  primaryAction: string;
  sections: Array<{ title: string; body: string; icon: keyof typeof Feather.glyphMap; value?: string }>;
};

const FEATURES: Record<string, Feature> = {
  attendance: {
    code: "attendance", title: "Attendance", subtitle: "Subject-wise attendance and shortage alerts", category: "Student Academics", icon: "check-square", color: "#2563EB", audience: "Student", primaryAction: "Request correction",
    sections: [
      { title: "Overall Attendance", value: "--", body: "Live percentage will appear after faculty uploads attendance.", icon: "bar-chart-2" },
      { title: "Shortage Alerts", body: "Students below the college threshold will be highlighted here.", icon: "alert-circle" },
      { title: "Subject Register", body: "Daily subject attendance records can be reviewed by date and subject.", icon: "book-open" },
    ],
  },
  "hall-ticket": {
    code: "hall-ticket", title: "Exam Hall Ticket", subtitle: "Hall ticket, exam room, seat, and instructions", category: "Examinations", icon: "file-text", color: "#7C3AED", audience: "Student", primaryAction: "Request hall ticket help",
    sections: [
      { title: "Hall Ticket Status", value: "Pending", body: "Published hall tickets will be available for download/view here.", icon: "credit-card" },
      { title: "Exam Room", body: "Room, seat number, and reporting time will be shown once assigned.", icon: "map-pin" },
      { title: "Instructions", body: "Carry college ID, hall ticket, and allowed stationery only.", icon: "info" },
    ],
  },
  "digital-id": {
    code: "digital-id", title: "Digital ID Card", subtitle: "Official student/faculty/admin identity", category: "Identity", icon: "credit-card", color: "#0F766E", audience: "All Roles", primaryAction: "Report ID issue",
    sections: [
      { title: "Digital Card", body: "Shows photo, role, department, hall ticket/employee reference, and QR validation.", icon: "user" },
      { title: "Verification", body: "Security staff can verify identity from the QR-enabled profile.", icon: "shield" },
      { title: "Profile Photo", body: "Update profile photo from the Profile screen.", icon: "camera" },
    ],
  },
  "leave-od": {
    code: "leave-od", title: "Leave / OD Requests", subtitle: "Apply and track approvals", category: "Student Requests", icon: "send", color: "#EA580C", audience: "Student", primaryAction: "Apply now",
    sections: [
      { title: "Leave Request", body: "Submit medical, personal, or academic leave requests for approval.", icon: "calendar" },
      { title: "On-Duty Request", body: "Apply for OD for events, internships, workshops, and competitions.", icon: "briefcase" },
      { title: "Approval Trail", body: "Admin/faculty responses and status updates appear in My Requests.", icon: "git-branch" },
    ],
  },
  helpdesk: {
    code: "helpdesk", title: "Helpdesk", subtitle: "Raise issues and track responses", category: "Support", icon: "life-buoy", color: "#0891B2", audience: "All Roles", primaryAction: "Raise ticket",
    sections: [
      { title: "Academic Support", body: "Report issues with marks, timetable, subjects, login, or attendance.", icon: "book" },
      { title: "Campus Support", body: "Hostel, transport, library, and infrastructure concerns can be tracked.", icon: "home" },
      { title: "Status Tracking", body: "Every ticket has open, in-progress, resolved, or rejected status.", icon: "activity" },
    ],
  },
  "faculty-directory": {
    code: "faculty-directory", title: "Faculty Directory", subtitle: "Department contacts and office hours", category: "Campus", icon: "users", color: "#4F46E5", audience: "All Roles", primaryAction: "Request directory update",
    sections: [
      { title: "Department Faculty", body: "Search faculty by department, designation, and subject expertise.", icon: "users" },
      { title: "Office Hours", body: "Faculty consultation hours and cabin details can be maintained by admins.", icon: "clock" },
      { title: "Contact Rules", body: "Official college email and approved contact channels are shown here.", icon: "mail" },
    ],
  },
  "academic-calendar": {
    code: "academic-calendar", title: "Academic Calendar", subtitle: "Holidays, exams, events, and deadlines", category: "Calendar", icon: "calendar", color: "#16A34A", audience: "All Roles", primaryAction: "Report calendar issue",
    sections: [
      { title: "Upcoming Events", body: "Seminars, college events, holidays, and exam dates appear here.", icon: "star" },
      { title: "Academic Deadlines", body: "Fee dates excluded, assignment deadlines, registrations, and form submissions.", icon: "clock" },
      { title: "Exam Timeline", body: "Internal and semester examination windows can be published by admins.", icon: "file-text" },
    ],
  },
  assignments: {
    code: "assignments", title: "Assignments", subtitle: "View assignments and submission status", category: "Academics", icon: "clipboard", color: "#DB2777", audience: "Student / Faculty", primaryAction: "Ask assignment query",
    sections: [
      { title: "Pending Work", value: "0", body: "Open assignments will appear with due date and subject.", icon: "clipboard" },
      { title: "Submission Status", body: "Submitted, late, graded, and resubmission statuses are tracked.", icon: "check-circle" },
      { title: "Faculty Publishing", body: "Faculty role can publish assignments from faculty management modules.", icon: "upload-cloud" },
    ],
  },
  "study-materials": {
    code: "study-materials", title: "Study Materials", subtitle: "Notes, PDFs, videos, and resources", category: "Academics", icon: "book-open", color: "#9333EA", audience: "Student / Faculty", primaryAction: "Request material",
    sections: [
      { title: "Subject Notes", body: "Materials are filtered by year, branch, semester, and subject.", icon: "book-open" },
      { title: "Videos & Links", body: "Faculty can share reference links and recorded sessions.", icon: "play-circle" },
      { title: "Downloads", body: "PDF and document storage can be connected to Supabase Storage later.", icon: "download" },
    ],
  },
  library: {
    code: "library", title: "Library", subtitle: "Books, issue history, due dates, and fines", category: "Campus", icon: "book", color: "#0D9488", audience: "Student", primaryAction: "Request library help",
    sections: [
      { title: "Issued Books", value: "0", body: "Current issued books and due dates will be listed here.", icon: "book" },
      { title: "Book Search", body: "Search by title, author, department, and availability.", icon: "search" },
      { title: "Fine Alerts", body: "Late return alerts and fine notices can be shown here.", icon: "alert-triangle" },
    ],
  },
  transport: {
    code: "transport", title: "Transport", subtitle: "Bus routes, pickup points, and timings", category: "Campus", icon: "truck", color: "#CA8A04", audience: "Student", primaryAction: "Request transport help",
    sections: [
      { title: "Assigned Route", body: "Student route and pickup point will appear after admin assignment.", icon: "map" },
      { title: "Timings", body: "Morning and evening route timings can be maintained by admins.", icon: "clock" },
      { title: "Driver Contact", body: "Emergency driver/contact details can be published securely.", icon: "phone" },
    ],
  },
  hostel: {
    code: "hostel", title: "Hostel", subtitle: "Room details, complaints, and warden contacts", category: "Campus", icon: "home", color: "#64748B", audience: "Student", primaryAction: "Raise hostel request",
    sections: [
      { title: "Room Details", body: "Hostel block, room number, and roommate details can be assigned.", icon: "home" },
      { title: "Warden Contact", body: "Warden and emergency contact information can be shown here.", icon: "phone" },
      { title: "Hostel Complaints", body: "Maintenance and room-related issues can be raised as service requests.", icon: "tool" },
    ],
  },
  placements: {
    code: "placements", title: "Placements", subtitle: "Jobs, eligibility, applications, interviews", category: "Career", icon: "briefcase", color: "#1D4ED8", audience: "Student", primaryAction: "Ask placement query",
    sections: [
      { title: "Eligible Drives", value: "0", body: "Eligible job drives will appear based on CGPA, branch, and batch.", icon: "briefcase" },
      { title: "Applications", body: "Applied, shortlisted, selected, and rejected status can be tracked.", icon: "check-square" },
      { title: "Interview Schedule", body: "Interview date, venue, and recruiter instructions appear here.", icon: "calendar" },
    ],
  },
  events: {
    code: "events", title: "Events", subtitle: "Workshops, seminars, fests, certificates", category: "Campus", icon: "star", color: "#F59E0B", audience: "All Roles", primaryAction: "Register interest",
    sections: [
      { title: "Open Events", body: "College events and registrations can be published here.", icon: "star" },
      { title: "Certificates", body: "Participation certificates can be linked after event completion.", icon: "award" },
      { title: "Event Attendance", body: "QR check-in can be added for official event attendance.", icon: "check-circle" },
    ],
  },
  "faculty-attendance": {
    code: "faculty-attendance", title: "Attendance Management", subtitle: "Record attendance and review shortages", category: "Faculty", icon: "check-square", color: "#2563EB", audience: "Faculty", primaryAction: "Open request queue",
    sections: [
      { title: "Class Register", body: "Faculty can mark attendance by subject, date, year, branch, and section.", icon: "edit-3" },
      { title: "Shortage Report", body: "Review students below attendance threshold.", icon: "alert-circle" },
      { title: "Correction Requests", body: "Student attendance correction requests appear in Requests.", icon: "inbox" },
    ],
  },
  "faculty-assignments": {
    code: "faculty-assignments", title: "Assignment Management", subtitle: "Publish assignments and materials", category: "Faculty", icon: "clipboard", color: "#DB2777", audience: "Faculty", primaryAction: "Open request queue",
    sections: [
      { title: "Publish Work", body: "Create assignments for specific year, branch, section, and subject.", icon: "upload-cloud" },
      { title: "Review Submissions", body: "Student submissions and grades can be managed here.", icon: "check-square" },
      { title: "Materials", body: "Attach PDFs, links, videos, and notes.", icon: "paperclip" },
    ],
  },
  "admin-requests": {
    code: "admin-requests", title: "Request Center", subtitle: "Review all official student requests", category: "Admin", icon: "inbox", color: "#0891B2", audience: "Admin", primaryAction: "Go to requests",
    sections: [
      { title: "Approval Queue", body: "Leave, helpdesk, hostel, library, event, and correction requests appear here.", icon: "inbox" },
      { title: "Role Routing", body: "Requests can be assigned to faculty/admin owners.", icon: "git-branch" },
      { title: "Audit Trail", body: "Each update stores status and response history.", icon: "shield" },
    ],
  },
  "admin-directory": {
    code: "admin-directory", title: "Directory & Calendar", subtitle: "Maintain official campus data", category: "Admin", icon: "settings", color: "#4F46E5", audience: "Admin", primaryAction: "Go to requests",
    sections: [
      { title: "Faculty Directory", body: "Maintain faculty records, departments, and office hours.", icon: "users" },
      { title: "Academic Calendar", body: "Publish holidays, exams, events, and deadlines.", icon: "calendar" },
      { title: "Campus Modules", body: "Transport, hostel, library, and placement data can be managed here.", icon: "database" },
    ],
  },
};

const FALLBACK: Feature = {
  code: "service", title: "University Service", subtitle: "Official campus service", category: "University", icon: "grid", color: "#2563EB", audience: "All Roles", primaryAction: "Submit request",
  sections: [{ title: "Service Details", body: "This service is available through the university portal.", icon: "info" }],
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data;
}

export default function ServiceDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const feature = FEATURES[String(params.code || "")] ?? FALLBACK;
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState(feature.title + " request");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const canManage = user?.role === "admin" || user?.role === "faculty";

  const submitRequest = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      await readJson(await fetch(getApiUrl("/api/data/services/requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ requesterUserId: user.id, serviceCode: feature.code, title: title.trim(), message: message.trim() }),
      }));
      setNotice("Request submitted. Track it from University Services > My Requests.");
      setModalOpen(false);
      setMessage("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  const primaryAction = () => {
    if (canManage) router.push({ pathname: "/services", params: { tab: "requests" } });
    else setModalOpen(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/services")}> 
            <Feather name="arrow-left" size={21} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: feature.color }]}>{feature.category}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{feature.title}</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: feature.color }]}> 
          <View style={styles.heroIcon}><Feather name={feature.icon} size={32} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{feature.subtitle}</Text>
            <Text style={styles.heroText}>Role: {feature.audience}</Text>
          </View>
        </View>

        {!!notice && <Text style={[styles.notice, { color: colors.primary, borderColor: colors.border }]}>{notice}</Text>}

        <View style={styles.sectionGrid}>
          {feature.sections.map((section) => (
            <View key={section.title} style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={[styles.cardIcon, { backgroundColor: feature.color + "18" }]}> 
                <Feather name={section.icon} size={19} color={feature.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{section.title}</Text>
                  {section.value ? <Text style={[styles.cardValue, { color: feature.color }]}>{section.value}</Text> : null}
                </View>
                <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{section.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.actionPanel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.actionTitle, { color: colors.foreground }]}>{canManage ? "Management Access" : "Need help?"}</Text>
          <Text style={[styles.actionBody, { color: colors.mutedForeground }]}>{canManage ? "Open the request queue to review, approve, resolve, or reject service requests." : "Submit a service request and the college team will respond in the portal."}</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: feature.color }]} onPress={primaryAction}>
            <Feather name={canManage ? "inbox" : "send"} size={17} color="#fff" />
            <Text style={styles.primaryButtonText}>{canManage ? "Open Requests" : feature.primaryAction}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}> 
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setModalOpen(false)}><Text style={[styles.sheetAction, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{feature.title}</Text>
              <Pressable onPress={submitRequest} disabled={busy || !title.trim()}>{busy ? <ActivityIndicator size="small" color={feature.color} /> : <Text style={[styles.sheetAction, { color: feature.color }]}>Send</Text>}</Pressable>
            </View>
            <View style={styles.sheetBody}>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Title</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Request title" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
              <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Details</Text>
              <TextInput value={message} onChangeText={setMessage} multiline placeholder="Add details for the college team" placeholderTextColor={colors.mutedForeground} style={[styles.textArea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  title: { fontSize: 25, fontFamily: "Inter_700Bold" },
  hero: { borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  heroText: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 11, fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionGrid: { gap: 10 },
  infoCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold" },
  cardValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardBody: { marginTop: 4, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  actionPanel: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 9 },
  actionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  actionBody: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  primaryButton: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1 },
  sheetHeader: { minHeight: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(148,163,184,0.35)" },
  sheetTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetAction: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sheetBody: { padding: 18, gap: 10 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 13, minHeight: 50, paddingHorizontal: 13, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  textArea: { borderWidth: 1, borderRadius: 13, minHeight: 120, paddingHorizontal: 13, paddingTop: 12, fontSize: 15, fontFamily: "Inter_500Medium", textAlignVertical: "top" },
});
