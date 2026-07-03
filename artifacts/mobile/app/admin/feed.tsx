import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

type MediaDraft = { type: "image" | "video"; url: string; caption: string };
type FeedPost = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  media: Array<MediaDraft & { id: string }>;
  counts: { comments: number; reports: number };
  createdAt: string;
  publishedAt?: string | null;
  author?: { id: string; name: string; role: string; profileImageUrl?: string } | null;
};

const EMPTY_MEDIA: MediaDraft = { type: "image", url: "", caption: "" };

function formatPostTime(value?: string | null) {
  if (!value) return "Just now";
  const then = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d";
  return new Date(value).toLocaleDateString();
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data;
}

export default function AdminFeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [mediaDraft, setMediaDraft] = useState<MediaDraft>(EMPTY_MEDIA);
  const [isMediaComposerOpen, setIsMediaComposerOpen] = useState(false);

  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-user-id": user?.id ?? "" }), [user?.id]);
  const initials = (user?.name || "Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";
  const getPostInitials = (post: FeedPost) => (post.author?.name || "University Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "UA";

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) => [post.title, post.body, post.status, String(post.counts.comments)].join(" ").toLowerCase().includes(q));
  }, [posts, searchQuery]);

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await readJson(await fetch(getApiUrl("/api/feed/posts?limit=50&status=published&actorUserId=" + user.id), { headers }));
      setPosts(data.posts ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load feed posts.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, headers]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setStatus("draft");
    setMedia([]);
    setMediaDraft(EMPTY_MEDIA);
    setIsMediaComposerOpen(false);
    setIsComposerOpen(false);
  };

  const editPost = (_post: FeedPost) => {
    router.push("/admin/feed-controls");
  };

  const openComposer = () => {
    router.push("/admin/feed-compose");
  };

  const addMedia = () => {
    if (!mediaDraft.url.trim()) return;
    setMedia((items) => [...items, { ...mediaDraft, url: mediaDraft.url.trim(), caption: mediaDraft.caption.trim() }]);
    setMediaDraft(EMPTY_MEDIA);
  };

  const pickAndUploadMedia = async () => {
    if (!user) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage("Media library permission is required to upload files.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const type = asset.type === "video" ? "video" : "image";
      const fallbackExt = type === "video" ? "mp4" : "jpg";
      const filename = asset.fileName || "feed-media-" + Date.now() + "." + fallbackExt;
      const formData = new FormData();
      formData.append("actorUserId", user.id);
      formData.append("caption", mediaDraft.caption);
      formData.append("file", { uri: asset.uri, name: filename, type: asset.mimeType || (type === "video" ? "video/mp4" : "image/jpeg") } as unknown as Blob);
      const data = await readJson(await fetch(getApiUrl("/api/feed/media"), { method: "POST", headers: { "x-user-id": user.id }, body: formData }));
      setMedia((items) => [...items, { type: data.media.type, url: data.media.url, caption: mediaDraft.caption }]);
      setMediaDraft(EMPTY_MEDIA);
      setMessage("Media uploaded and added to the post.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not upload media.");
    }
  };

  const savePost = async () => {
    if (!user) return;
    try {
      const payload = { actorUserId: user.id, title, body, status, media };
      const url = editingId ? getApiUrl("/api/feed/posts/" + editingId) : getApiUrl("/api/feed/posts");
      await readJson(await fetch(url, { method: editingId ? "PUT" : "POST", headers, body: JSON.stringify(payload) }));
      setMessage(editingId ? "Feed post updated." : "Feed post created.");
      resetForm();
      await loadPosts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save feed post.");
    }
  };


  const renderMediaPreview = (item: MediaDraft, index: number, removable = false) => (
    <View key={index} style={[styles.mediaPreview, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
      {item.type === "image" ? <Image source={{ uri: item.url }} style={styles.previewImage} /> : <Feather name="play-circle" size={30} color={colors.primary} />}
      <View style={{ flex: 1 }}>
        <Text style={[styles.mediaType, { color: colors.foreground }]}>{item.type === "image" ? "Image" : "Video"}</Text>
        {!!item.caption && <Text style={[styles.mediaCaption, { color: colors.mutedForeground }]}>{item.caption}</Text>}
      </View>
      {removable && <Pressable onPress={() => setMedia((items) => items.filter((_, i) => i !== index))}><Feather name="x" size={18} color={colors.destructive} /></Pressable>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 }]}> 
      <View style={styles.socialTopBar}>
        <Pressable
          style={({ pressed }) => [styles.feedAvatar, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          onPress={() => router.push("/admin/profile")}
        >
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.feedAvatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          )}
        </Pressable>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Feather name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search feed, notices, posts"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {!!searchQuery && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [styles.feedAvatar, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
          onPress={() => router.push("/admin/notification-controls")}
        >
          <Feather name="bell" size={20} color={colors.primary} />
        </Pressable>
      </View>
      <View style={styles.feedTitleRow}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Campus Feed</Text>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Published university announcements</Text>
        </View>
        <Pressable style={[styles.manageLink, { borderColor: colors.border }]} onPress={() => router.push("/admin/feed-controls")}>
          <Feather name="sliders" size={15} color={colors.primary} />
          <Text style={[styles.manageLinkText, { color: colors.primary }]}>Manage</Text>
        </Pressable>
      </View>
      {!!message && <Text style={[styles.message, { borderColor: colors.border, color: message.includes("failed") || message.includes("Could") ? colors.destructive : colors.primary }]}>{message}</Text>}


      {loading ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading posts...</Text> : null}
      {!loading && filteredPosts.length === 0 ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{searchQuery ? "No feed posts match your search." : "No published feed posts yet."}</Text> : null}
      {filteredPosts.map((post) => (
        <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.postAuthorRow}>
            <View style={[styles.postAvatar, { backgroundColor: colors.primary + "22" }]}>
              {(post.author?.profileImageUrl || (post.author?.id === user?.id ? user?.profileImageUrl : "")) ? (
                <Image source={{ uri: post.author?.profileImageUrl || user?.profileImageUrl || "" }} style={styles.postAvatarImage} />
              ) : (
                <Text style={[styles.postAvatarText, { color: colors.primary }]}>{getPostInitials(post)}</Text>
              )}
            </View>
            <View style={styles.postAuthorTextBlock}>
              <Text style={[styles.postAuthorName, { color: colors.foreground }]}>{post.author?.name || "University Admin"}</Text>
              <Text style={[styles.postAuthorMeta, { color: colors.mutedForeground }]}>University Administration - {formatPostTime(post.publishedAt || post.createdAt)}</Text>
            </View>
            <Pressable style={[styles.iconButton, { backgroundColor: colors.secondary }]} onPress={() => editPost(post)}>
              <Feather name="edit-2" size={16} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>
          {!!post.body && <Text numberOfLines={4} style={[styles.postBody, { color: colors.foreground }]}>{post.body}</Text>}
          {post.media.slice(0, 2).map((item, index) => renderMediaPreview(item, index))}
          <View style={[styles.feedActionRow, { borderTopColor: colors.border }]}> 
            <View style={styles.feedMetric}><Feather name="thumbs-up" size={16} color={colors.mutedForeground} /><Text style={[styles.feedMetricText, { color: colors.mutedForeground }]}>0</Text></View>
            <View style={styles.feedMetric}><Feather name="message-circle" size={16} color={colors.mutedForeground} /><Text style={[styles.feedMetricText, { color: colors.mutedForeground }]}>{post.counts.comments}</Text></View>
            <View style={styles.feedMetric}><Feather name="send" size={16} color={colors.mutedForeground} /><Text style={[styles.feedMetricText, { color: colors.mutedForeground }]}>Share</Text></View>
          </View>
        </View>
      ))}
    </ScrollView>
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}> 
      <Pressable style={styles.bottomItem} onPress={() => router.push("/admin/feed")}>
        <Feather name="home" size={22} color={colors.primary} />
        <Text style={[styles.bottomLabelActive, { color: colors.primary }]}>Home</Text>
      </Pressable>
      <Pressable style={styles.bottomItem} onPress={() => router.push("/admin")}>
        <Feather name="grid" size={22} color={colors.mutedForeground} />
        <Text style={[styles.bottomLabel, { color: colors.mutedForeground }]}>Manage</Text>
      </Pressable>
      <Pressable style={styles.centerPostButton} onPress={openComposer}>
        <View style={[styles.postFab, { backgroundColor: colors.primary }]}> 
          <Feather name="plus" size={27} color="#fff" />
        </View>
        <Text style={[styles.bottomLabel, { color: colors.mutedForeground }]}>Post</Text>
      </Pressable>
      <Pressable style={styles.bottomItem} onPress={() => router.push("/admin/notification-controls")}><Feather name="bell" size={22} color={colors.mutedForeground} />
        <Text style={[styles.bottomLabel, { color: colors.mutedForeground }]}>Notices</Text>
      </Pressable>
      <Pressable style={styles.bottomItem} onPress={() => router.push("/admin/profile")}>
        <Feather name="user" size={22} color={colors.mutedForeground} />
        <Text style={[styles.bottomLabel, { color: colors.mutedForeground }]}>Profile</Text>
      </Pressable>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14 },
  socialTopBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  feedAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  feedAvatarImage: { width: "100%", height: "100%" },
  searchBox: { flex: 1, minWidth: 0, minHeight: 48, borderWidth: 1, borderRadius: 24, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontFamily: "Inter_600SemiBold", paddingVertical: 0 },
  feedTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  manageLink: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  manageLinkText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  headerBlock: { gap: 12 },
  screenTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  screenTitle: { flex: 1, textAlign: "center", fontSize: 21, fontFamily: "Inter_700Bold" },
  roundIconButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brandLockup: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  brandMark: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  adminName: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 2 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  addButton: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  profileButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  feedHero: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 5 },
  navRail: { borderWidth: 1, borderRadius: 16, padding: 5, flexDirection: "row", gap: 5 },
  navItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  navItemText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  navItemActiveText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  pageTitle: { fontSize: 27, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  message: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: "Inter_600SemiBold" },
  editorCard: { borderWidth: 1, borderRadius: 14, padding: 15, gap: 12 },
  editorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  linkText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "Inter_500Medium" },
  textArea: { borderWidth: 1, borderRadius: 10, minHeight: 110, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segment: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  segmentText: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  optionalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 3 },
  attachButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  attachButtonText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  typeButton: { borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  typeText: { fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  mediaPreview: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  previewImage: { width: 66, height: 54, borderRadius: 9, backgroundColor: "#111827" },
  mediaType: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  mediaCaption: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mediaActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, flexGrow: 1 },
  secondaryButtonText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  primaryButton: { borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyText: { textAlign: "center", paddingVertical: 24, fontFamily: "Inter_600SemiBold" },
  postCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 11 },
  postHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  postAvatarImage: { width: "100%", height: "100%" },
  postAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  postAuthorTextBlock: { flex: 1, minWidth: 0 },
  postAuthorName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  postAuthorMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  postTitle: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 23 },
  postMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3, textTransform: "capitalize" },
  postBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  feedActionRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  feedMetric: { flexDirection: "row", alignItems: "center", gap: 6 },
  feedMetricText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  iconButton: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  bottomNav: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 6, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
  bottomItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 54 },
  centerPostButton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 70 },
  postFab: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bottomLabel: { fontSize: 11, fontFamily: "Inter_700Bold" },
  bottomLabelActive: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
