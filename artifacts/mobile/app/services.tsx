import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

type ServiceItem = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  targetRole: "all" | "student" | "admin" | "faculty";
  icon: keyof typeof Feather.glyphMap;
  isActive: boolean;
  metadata?: Record<string, unknown>;
};

type ServiceForm = {
  id?: string;
  code: string;
  title: string;
  description: string;
  category: string;
  targetRole: "all" | "student" | "admin" | "faculty";
  icon: keyof typeof Feather.glyphMap;
  isActive: boolean;
};

type ServiceRequest = {
  id: string;
  serviceCode: string;
  requesterUserId: string;
  requesterName: string;
  status: string;
  title: string;
  message: string;
  response?: string;
  createdAt: string;
};

const EMPTY_SERVICE_FORM: ServiceForm = { code: "", title: "", description: "", category: "general", targetRole: "all", icon: "grid", isActive: true };

const STATUS_OPTIONS = ["open", "in_progress", "approved", "resolved", "rejected", "closed"];

const ROLE_OPTIONS: ServiceForm["targetRole"][] = ["all", "student", "faculty", "admin"];

const STATUS_COLORS: Record<string, string> = {
  open: "#3B82F6",
  in_progress: "#F59E0B",
  approved: "#22C55E",
  resolved: "#22C55E",
  rejected: "#EF4444",
  closed: "#64748B",
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ServicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"services" | "requests">("services");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [serviceForm, setServiceForm] = useState<ServiceForm | null>(null);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(null);
  const [requestResponse, setRequestResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const role = user?.role ?? "student";
  const canManage = role === "admin" || role === "faculty";

  const loadData = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      const [serviceData, requestData] = await Promise.all([
        readJson(await fetch(getApiUrl("/api/data/services?role=" + role))),
        readJson(await fetch(getApiUrl("/api/data/services/requests?actorUserId=" + user.id))),
      ]);
      setServices(serviceData.services ?? []);
      setRequests(requestData.requests ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load services.");
    } finally {
      setBusy(false);
    }
  }, [role, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) => [service.title, service.description, service.category, service.code].join(" ").toLowerCase().includes(query));
  }, [serviceQuery, services]);

  const groupedServices = useMemo(() => {
    const groups: Record<string, ServiceItem[]> = {};
    for (const service of filteredServices) {
      const key = service.category || "general";
      groups[key] = groups[key] || [];
      groups[key].push(service);
    }
    return groups;
  }, [filteredServices]);

  const openServiceForm = (service?: ServiceItem) => {
    if (!service) {
      setServiceForm({ ...EMPTY_SERVICE_FORM });
      return;
    }
    setServiceForm({
      id: service.id,
      code: service.code,
      title: service.title,
      description: service.description,
      category: service.category || "general",
      targetRole: service.targetRole || "all",
      icon: service.icon || "grid",
      isActive: service.isActive !== false,
    });
  };

  const saveService = async () => {
    if (!user || !serviceForm?.title.trim()) return;
    setBusy(true);
    try {
      const isEdit = !!serviceForm.id;
      await readJson(await fetch(getApiUrl(isEdit ? "/api/data/services/" + serviceForm.id : "/api/data/services"), {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ ...serviceForm, actorUserId: user.id }),
      }));
      setServiceForm(null);
      setMessage(isEdit ? "Service updated." : "Service created.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save service.");
    } finally {
      setBusy(false);
    }
  };

  const openRequestEditor = (request: ServiceRequest) => {
    setEditingRequest(request);
    setRequestResponse(request.response || "");
  };

  const saveRequestEditor = async () => {
    if (!user || !editingRequest) return;
    setBusy(true);
    try {
      await readJson(await fetch(getApiUrl("/api/data/services/requests/" + editingRequest.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ actorUserId: user.id, status: editingRequest.status, title: editingRequest.title, message: editingRequest.message, serviceCode: editingRequest.serviceCode, response: requestResponse }),
      }));
      setEditingRequest(null);
      setRequestResponse("");
      setMessage("Request updated.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update request.");
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async () => {
    if (!user || !selectedService || !requestTitle.trim()) return;
    setBusy(true);
    try {
      await readJson(await fetch(getApiUrl("/api/data/services/requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ requesterUserId: user.id, serviceCode: selectedService.code, title: requestTitle.trim(), message: requestMessage.trim() }),
      }));
      setSelectedService(null);
      setRequestTitle("");
      setRequestMessage("");
      setMessage("Request submitted.");
      setActiveTab("requests");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  };

  const seedCatalog = async () => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      await readJson(await fetch(getApiUrl("/api/data/services/seed"), { method: "POST" }));
      setMessage("Service catalog loaded.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load service catalog.");
    } finally {
      setBusy(false);
    }
  };

  const updateRequest = async (request: ServiceRequest, status: string) => {
    if (!user) return;
    setBusy(true);
    try {
      await readJson(await fetch(getApiUrl("/api/data/services/requests/" + request.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ actorUserId: user.id, status, response: status === "approved" ? "Approved by " + user.name : status === "resolved" ? "Resolved by " + user.name : "Updated by " + user.name }),
      }));
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update request.");
    } finally {
      setBusy(false);
    }
  };

  const backTarget = role === "admin" ? "/admin/feed" : role === "faculty" ? "/login" : "/(tabs)/feed";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(backTarget as "/")}> 
            <Feather name="arrow-left" size={21} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: colors.primary }]}>{role.toUpperCase()} PORTAL</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>University Services</Text>
          </View>
          {role === "admin" && (
            <Pressable style={[styles.iconButton, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => openServiceForm()}>
              <Feather name="plus" size={22} color="#fff" />
            </Pressable>
          )}
        </View>

        <View style={[styles.hero, { backgroundColor: colors.primary }]}> 
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{canManage ? "Operations Desk" : "Student Service Center"}</Text>
            <Text style={styles.heroText}>{canManage ? "Review requests, approvals, and campus service workflows." : "Access attendance, ID card, leave, helpdesk, library, hostel, transport, placements, and events."}</Text>
          </View>
          <View style={styles.heroIcon}><Feather name="grid" size={30} color="#fff" /></View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{services.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Services</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{requests.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Requests</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{Object.keys(groupedServices).length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Categories</Text>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={serviceQuery}
            onChangeText={setServiceQuery}
            placeholder="Search attendance, ID, leave, library..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        {role === "admin" && (
          <View style={[styles.adminPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.adminPanelHeader}>
              <View style={[styles.adminPanelIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="settings" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.adminPanelTitle, { color: colors.foreground }]}>Service Administration</Text>
                <Text style={[styles.adminPanelSub, { color: colors.mutedForeground }]}>Create and maintain attendance, ID, leave, helpdesk, library, hostel, transport and placement services.</Text>
              </View>
            </View>
            <View style={styles.adminActionRow}>
              <Pressable style={[styles.adminActionButton, { backgroundColor: colors.primary }]} onPress={() => openServiceForm()}>
                <Feather name="plus" size={15} color="#fff" />
                <Text style={styles.adminActionText}>Add Service</Text>
              </Pressable>
              <Pressable style={[styles.adminActionButton, { backgroundColor: "#0F766E" }]} onPress={seedCatalog} disabled={busy}>
                <Feather name="download-cloud" size={15} color="#fff" />
                <Text style={styles.adminActionText}>Load Official List</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.tabRail, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Pressable style={[styles.tab, activeTab === "services" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("services")}>
            <Feather name="grid" size={15} color={activeTab === "services" ? "#fff" : colors.primary} />
            <Text style={[styles.tabText, { color: activeTab === "services" ? "#fff" : colors.foreground }]}>Services</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === "requests" && { backgroundColor: colors.primary }]} onPress={() => setActiveTab("requests")}>
            <Feather name="inbox" size={15} color={activeTab === "requests" ? "#fff" : colors.primary} />
            <Text style={[styles.tabText, { color: activeTab === "requests" ? "#fff" : colors.foreground }]}>{canManage ? "Requests" : "My Requests"}</Text>
          </Pressable>
        </View>

        {!!message && <Text style={[styles.message, { color: colors.primary, borderColor: colors.border }]}>{message}</Text>}
        {busy && services.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}

        {activeTab === "services" ? (
          services.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Feather name="grid" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Service catalog is not loaded</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Load the official university services to show attendance, ID card, leave, library, transport, hostel, placements, events, and support.</Text>
              {canManage && (
                <Pressable style={[styles.seedButton, { backgroundColor: colors.primary }]} onPress={seedCatalog} disabled={busy}>
                  <Feather name="download-cloud" size={16} color="#fff" />
                  <Text style={styles.seedButtonText}>Load Services</Text>
                </Pressable>
              )}
            </View>
          ) : Object.keys(groupedServices).length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No matching services</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different search term.</Text>
            </View>
          ) : Object.entries(groupedServices).map(([category, items]) => (
            <View key={category} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{category.replace(/_/g, " ")}</Text>
              {items.map((service) => (
                <Pressable key={service.code} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push({ pathname: "/service-detail", params: { code: service.code } })}>
                  <View style={[styles.serviceIcon, { backgroundColor: colors.primary + "18" }]}> 
                    <Feather name={service.icon || "grid"} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.serviceTitle, { color: colors.foreground }]}>{service.title}</Text>
                    <Text style={[styles.serviceDescription, { color: colors.mutedForeground }]}>{service.description}</Text>
                  </View>
                  {role === "admin" ? (
                    <Pressable style={[styles.cardEditButton, { backgroundColor: colors.primary + "14" }]} onPress={() => openServiceForm(service)}>
                      <Feather name="edit-2" size={16} color={colors.primary} />
                    </Pressable>
                  ) : (
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  )}
                </Pressable>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.section}>
            {requests.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No service requests yet.</Text>
              </View>
            ) : requests.map((request) => {
              const statusColor = STATUS_COLORS[request.status] ?? colors.primary;
              return (
                <View key={request.id} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <View style={styles.requestTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.requestTitle, { color: colors.foreground }]}>{request.title}</Text>
                      <Text style={[styles.requestMeta, { color: colors.mutedForeground }]}>{request.requesterName} - {request.serviceCode} - {formatDate(request.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusColor + "18" }]}><Text style={[styles.statusText, { color: statusColor }]}>{request.status.replace("_", " ")}</Text></View>
                  </View>
                  {!!request.message && <Text style={[styles.requestMessage, { color: colors.foreground }]}>{request.message}</Text>}
                  {!!request.response && <Text style={[styles.responseText, { color: colors.mutedForeground }]}>{request.response}</Text>}
                  {canManage && (
                    <View style={styles.requestActions}>
                      <Pressable style={[styles.smallButton, { backgroundColor: colors.primary }]} onPress={() => openRequestEditor(request)}><Text style={styles.smallButtonText}>Edit</Text></Pressable>
                      <Pressable style={[styles.smallButton, { backgroundColor: "#F59E0B" }]} onPress={() => updateRequest(request, "in_progress")}><Text style={styles.smallButtonText}>In Progress</Text></Pressable>
                      <Pressable style={[styles.smallButton, { backgroundColor: "#22C55E" }]} onPress={() => updateRequest(request, "resolved")}><Text style={styles.smallButtonText}>Resolve</Text></Pressable>
                      <Pressable style={[styles.smallButton, { backgroundColor: "#EF4444" }]} onPress={() => updateRequest(request, "rejected")}><Text style={styles.smallButtonText}>Reject</Text></Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!serviceForm} transparent animationType="slide" onRequestClose={() => setServiceForm(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setServiceForm(null)}><Text style={[styles.sheetAction, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{serviceForm?.id ? "Edit Service" : "Add Service"}</Text>
              <Pressable onPress={saveService} disabled={busy || !serviceForm?.title.trim()}><Text style={[styles.sheetAction, { color: colors.primary }]}>Save</Text></Pressable>
            </View>
            {!!serviceForm && (
              <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Service Title</Text>
                <TextInput value={serviceForm.title} onChangeText={(title) => setServiceForm((current) => current ? { ...current, title } : current)} placeholder="Library Services" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Code</Text>
                <TextInput value={serviceForm.code} onChangeText={(code) => setServiceForm((current) => current ? { ...current, code } : current)} placeholder="library" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} autoCapitalize="none" />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Description</Text>
                <TextInput value={serviceForm.description} onChangeText={(description) => setServiceForm((current) => current ? { ...current, description } : current)} multiline placeholder="What students/faculty can do here" placeholderTextColor={colors.mutedForeground} style={[styles.textArea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Category</Text>
                <TextInput value={serviceForm.category} onChangeText={(category) => setServiceForm((current) => current ? { ...current, category } : current)} placeholder="academics" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} autoCapitalize="none" />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Icon</Text>
                <TextInput value={serviceForm.icon} onChangeText={(icon) => setServiceForm((current) => current ? { ...current, icon: (icon || "grid") as ServiceForm["icon"] } : current)} placeholder="grid" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} autoCapitalize="none" />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Visible To</Text>
                <View style={styles.optionRow}>
                  {ROLE_OPTIONS.map((option) => (
                    <Pressable key={option} style={[styles.optionChip, { borderColor: colors.border, backgroundColor: serviceForm.targetRole === option ? colors.primary : colors.secondary }]} onPress={() => setServiceForm((current) => current ? { ...current, targetRole: option } : current)}>
                      <Text style={[styles.optionText, { color: serviceForm.targetRole === option ? "#fff" : colors.foreground }]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={[styles.toggleRow, { backgroundColor: colors.secondary, borderColor: colors.border }]} onPress={() => setServiceForm((current) => current ? { ...current, isActive: !current.isActive } : current)}>
                  <Feather name={serviceForm.isActive ? "check-circle" : "circle"} size={18} color={serviceForm.isActive ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{serviceForm.isActive ? "Active service" : "Inactive service"}</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingRequest} transparent animationType="slide" onRequestClose={() => setEditingRequest(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setEditingRequest(null)}><Text style={[styles.sheetAction, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Request</Text>
              <Pressable onPress={saveRequestEditor} disabled={busy || !editingRequest?.title.trim()}><Text style={[styles.sheetAction, { color: colors.primary }]}>Save</Text></Pressable>
            </View>
            {!!editingRequest && (
              <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Status</Text>
                <View style={styles.optionRow}>
                  {STATUS_OPTIONS.map((option) => (
                    <Pressable key={option} style={[styles.optionChip, { borderColor: colors.border, backgroundColor: editingRequest.status === option ? (STATUS_COLORS[option] || colors.primary) : colors.secondary }]} onPress={() => setEditingRequest((current) => current ? { ...current, status: option } : current)}>
                      <Text style={[styles.optionText, { color: editingRequest.status === option ? "#fff" : colors.foreground }]}>{option.replace("_", " ")}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Service Code</Text>
                <TextInput value={editingRequest.serviceCode} onChangeText={(serviceCode) => setEditingRequest((current) => current ? { ...current, serviceCode } : current)} placeholder="service-code" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} autoCapitalize="none" />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Title</Text>
                <TextInput value={editingRequest.title} onChangeText={(title) => setEditingRequest((current) => current ? { ...current, title } : current)} placeholder="Request title" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Student / Faculty Message</Text>
                <TextInput value={editingRequest.message} onChangeText={(message) => setEditingRequest((current) => current ? { ...current, message } : current)} multiline placeholder="Request details" placeholderTextColor={colors.mutedForeground} style={[styles.textArea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Official Response</Text>
                <TextInput value={requestResponse} onChangeText={setRequestResponse} multiline placeholder="Reply shown to the requester" placeholderTextColor={colors.mutedForeground} style={[styles.textArea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedService} transparent animationType="slide" onRequestClose={() => setSelectedService(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 18 }]}> 
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setSelectedService(null)}><Text style={[styles.sheetAction, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{selectedService?.title}</Text>
              <Pressable onPress={submitRequest} disabled={busy || canManage || !requestTitle.trim()}><Text style={[styles.sheetAction, { color: colors.primary, opacity: canManage ? 0.45 : 1 }]}>{canManage ? "View" : "Send"}</Text></Pressable>
            </View>
            <View style={styles.sheetBody}>
              <Text style={[styles.serviceDescription, { color: colors.mutedForeground }]}>{selectedService?.description}</Text>
              {canManage ? (
                <Text style={[styles.infoText, { color: colors.foreground }]}>This feature is available to manage through the Requests tab. Student submissions and approvals will appear there.</Text>
              ) : (
                <>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Request Title</Text>
                  <TextInput value={requestTitle} onChangeText={setRequestTitle} placeholder="What do you need?" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Details</Text>
                  <TextInput value={requestMessage} onChangeText={setRequestMessage} multiline placeholder="Add details for the office/faculty" placeholderTextColor={colors.mutedForeground} style={[styles.textArea, { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground }]} />
                </>
              )}
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
  hero: { borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  heroTitle: { color: "#fff", fontSize: 21, fontFamily: "Inter_700Bold", marginBottom: 4 },
  heroText: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  heroIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 3 },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  searchBox: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", paddingVertical: 0 },
  adminPanel: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  adminPanelHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  adminPanelIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  adminPanelTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  adminPanelSub: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17, marginTop: 2 },
  adminActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  adminActionButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 7 },
  adminActionText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  tabRail: { flexDirection: "row", borderWidth: 1, borderRadius: 16, padding: 5, gap: 6 },
  tab: { flex: 1, minHeight: 42, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  tabText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  message: { borderWidth: 1, borderRadius: 12, padding: 10, fontSize: 13, fontFamily: "Inter_700Bold" },
  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  serviceCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  serviceIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cardEditButton: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  serviceTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 3 },
  serviceDescription: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 26, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 19 },
  seedButton: { borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  seedButtonText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  requestCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  requestTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  requestTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  requestMeta: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 3, textTransform: "capitalize" },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  requestMessage: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  responseText: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  requestActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallButton: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  smallButtonText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: "86%" },
  sheetHeader: { minHeight: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(148,163,184,0.35)" },
  sheetTitle: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetAction: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sheetBody: { padding: 18, gap: 10 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 13, minHeight: 50, paddingHorizontal: 13, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  textArea: { borderWidth: 1, borderRadius: 13, minHeight: 120, paddingHorizontal: 13, paddingTop: 12, fontSize: 15, fontFamily: "Inter_500Medium", textAlignVertical: "top" },
  infoText: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  optionText: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  toggleRow: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 9 },
});
