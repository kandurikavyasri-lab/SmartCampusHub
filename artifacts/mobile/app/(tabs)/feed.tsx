import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

type FeedMedia = { id: string; type: "image" | "video"; url: string; caption?: string | null };
type FeedComment = { id: string; body: string; createdAt: string; author?: { id?: string; name: string; role: string; profileImageUrl?: string } | null; replies: FeedComment[] };
type FeedPost = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  publishedAt?: string | null;
  author?: { id?: string; name: string; role: string; profileImageUrl?: string } | null;
  media: FeedMedia[];
  counts: { comments: number; reports: number; likes: number };
  viewer?: { hasLiked: boolean };
};

const REPORT_REASONS = ["inappropriate", "misleading", "spam", "abuse", "other"];

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

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");

  const authHeaders = { "Content-Type": "application/json", "x-user-id": user?.id ?? "" };
  const firstName = user?.name?.split(" ")[0] || "Student";
  const initials = (user?.name || "Student")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ST";
  const getPostInitials = (post: FeedPost) => (post.author?.name || "University Admin")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "UA";
  const getCommentInitials = (comment: FeedComment) => (comment.author?.name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setError("");
    try {
      const data = await readJson(await fetch(getApiUrl("/api/feed/posts?limit=20&actorUserId=" + user.id), { headers: authHeaders }));
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const loadComments = async (postId: string) => {
    if (!user) return;
    const data = await readJson(await fetch(getApiUrl("/api/feed/posts/" + postId + "/comments?actorUserId=" + user.id), { headers: authHeaders }));
    setComments((current) => ({ ...current, [postId]: data.comments ?? [] }));
  };

  const toggleComments = async (postId: string) => {
    const next = expandedPostId === postId ? null : postId;
    setExpandedPostId(next);
    if (next && !comments[postId]) await loadComments(postId);
  };

  const addComment = async (postId: string, parentCommentId?: string) => {
    if (!user) return;
    const draftKey = parentCommentId || postId;
    const body = parentCommentId ? replyDrafts[draftKey] : commentDrafts[draftKey];
    if (!body?.trim()) return;
    try {
      await readJson(await fetch(getApiUrl("/api/feed/posts/" + postId + "/comments"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ actorUserId: user.id, body, parentCommentId }),
      }));
      if (parentCommentId) setReplyDrafts((current) => ({ ...current, [draftKey]: "" }));
      else setCommentDrafts((current) => ({ ...current, [draftKey]: "" }));
      await loadComments(postId);
      await loadPosts();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not add comment.");
    }
  };


  const toggleLike = async (post: FeedPost) => {
    if (!user) return;
    const wasLiked = !!post.viewer?.hasLiked;
    setPosts((current) => current.map((item) => item.id === post.id ? {
      ...item,
      counts: { ...item.counts, likes: Math.max(0, (item.counts.likes ?? 0) + (wasLiked ? -1 : 1)) },
      viewer: { ...item.viewer, hasLiked: !wasLiked },
    } : item));
    try {
      const data = await readJson(await fetch(getApiUrl("/api/feed/posts/" + post.id + "/like"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ actorUserId: user.id }),
      }));
      setPosts((current) => current.map((item) => item.id === post.id ? {
        ...item,
        counts: { ...item.counts, likes: data.likes ?? item.counts.likes ?? 0 },
        viewer: { ...item.viewer, hasLiked: !!data.liked },
      } : item));
    } catch (err) {
      setPosts((current) => current.map((item) => item.id === post.id ? {
        ...item,
        counts: { ...item.counts, likes: Math.max(0, (item.counts.likes ?? 0) + (wasLiked ? 1 : -1)) },
        viewer: { ...item.viewer, hasLiked: wasLiked },
      } : item));
      setNotice(err instanceof Error ? err.message : "Could not update like.");
    }
  };

  const sharePost = async (post: FeedPost) => {
    try {
      const message = [post.title, post.body, "Shared from SmartCampusHub"].filter(Boolean).join("\n\n");
      await Share.share({ title: post.title, message });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not open share options.");
    }
  };

  const reportPost = async (postId: string) => {
    if (!user) return;
    try {
      await readJson(await fetch(getApiUrl("/api/feed/posts/" + postId + "/report"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ actorUserId: user.id, reason: REPORT_REASONS[0], details: "Reported from mobile app" }),
      }));
      setNotice("Report submitted for review.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not submit report.");
    }
  };

  const reportComment = async (commentId: string) => {
    if (!user) return;
    try {
      await readJson(await fetch(getApiUrl("/api/feed/comments/" + commentId + "/report"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ actorUserId: user.id, reason: REPORT_REASONS[0], details: "Reported from mobile app" }),
      }));
      setNotice("Comment report submitted.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not submit report.");
    }
  };

  const renderMedia = (media: FeedMedia[]) => {
    if (!media.length) return null;
    return (
      <View style={styles.mediaGrid}>
        {media.map((item) => item.type === "image" ? (
          <View key={item.id} style={styles.mediaBlock}>
            <Image source={{ uri: item.url }} style={styles.imageMedia} resizeMode="cover" />
            {!!item.caption && <Text style={[styles.caption, { color: colors.mutedForeground }]}>{item.caption}</Text>}
          </View>
        ) : (
          <View key={item.id} style={[styles.videoMedia, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            <Feather name="play-circle" size={34} color={colors.primary} />
            <Text style={[styles.videoLabel, { color: colors.foreground }]}>Video attachment</Text>
            {!!item.caption && <Text style={[styles.caption, { color: colors.mutedForeground }]}>{item.caption}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const renderComment = (postId: string, item: FeedComment, isReply = false) => {
    const replyCount = item.replies?.length ?? 0;
    const repliesOpen = !!expandedReplyThreads[item.id];
    return (
      <View key={item.id} style={[styles.commentBox, isReply && styles.replyBox, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
        <View style={styles.commentThreadRow}>
          <View style={[styles.commentAvatar, isReply && styles.replyAvatar, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.commentAvatarText, { color: colors.primary }]}>{getCommentInitials(item)}</Text>
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentAuthor, { color: colors.foreground }]}>{item.author?.name ?? "User"}</Text>
              <Pressable onPress={() => reportComment(item.id)}><Feather name="flag" size={15} color={colors.mutedForeground} /></Pressable>
            </View>
            <Text style={[styles.commentText, { color: colors.foreground }]}>{item.body}</Text>
          </View>
        </View>
        {!isReply && (
          <View style={styles.replyComposer}>
            <TextInput
              value={replyDrafts[item.id] ?? ""}
              onChangeText={(value) => setReplyDrafts((current) => ({ ...current, [item.id]: value }))}
              placeholder="Write a reply"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.replyInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            <Pressable style={[styles.smallButton, { backgroundColor: colors.primary }]} onPress={() => addComment(postId, item.id)}>
              <Feather name="send" size={14} color="#fff" />
            </Pressable>
          </View>
        )}
        {!isReply && replyCount > 0 && (
          <Pressable
            style={styles.replyToggle}
            onPress={() => setExpandedReplyThreads((current) => ({ ...current, [item.id]: !repliesOpen }))}
          >
            <Feather name={repliesOpen ? "chevron-up" : "chevron-down"} size={15} color={colors.primary} />
            <Text style={[styles.replyToggleText, { color: colors.primary }]}>
              {repliesOpen ? "Hide replies" : "Show " + replyCount + " replies"}
            </Text>
          </Pressable>
        )}
        {(isReply || repliesOpen) && item.replies?.map((reply) => renderComment(postId, reply, true))}
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(); }} />}
    >
      <View style={styles.homeHeader}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}> 
            <Feather name="book-open" size={20} color="#fff" />
          </View>
          <View style={styles.brandTextBlock}>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>SmartCampusHub</Text>
            <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>Hello, {firstName}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.profileButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.profileAvatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
            )}
          </Pressable>
        </View>
        <View style={[styles.heroPanel, { backgroundColor: colors.primary }]}> 
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Campus Feed</Text>
            <Text style={styles.heroSubtitle}>Official announcements, media updates, and student discussions.</Text>
          </View>
          <View style={styles.heroIconBox}>
            <Feather name="message-square" size={28} color="#fff" />
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.metaPill, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Feather name="rss" size={15} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.foreground }]}>{posts.length} posts</Text>
          </View>
          <View style={[styles.metaPill, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Feather name="user" size={15} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.foreground }]}>{user?.year || "Student"}</Text>
          </View>
        </View>
      </View>
      {!!notice && <Text style={[styles.notice, { color: colors.primary, borderColor: colors.border }]}>{notice}</Text>}
      {loading ? <Text style={[styles.stateText, { color: colors.mutedForeground }]}>Loading feed...</Text> : null}
      {!!error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}
      {!loading && !error && posts.length === 0 ? <Text style={[styles.stateText, { color: colors.mutedForeground }]}>No published posts yet.</Text> : null}
      {posts.map((post) => (
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
              <Text style={[styles.postAuthorMeta, { color: colors.mutedForeground }]}>
                University Administration - {formatPostTime(post.publishedAt || post.createdAt)}
              </Text>
            </View>
            <Pressable style={[styles.iconButton, { backgroundColor: colors.secondary }]} onPress={() => reportPost(post.id)}>
              <Feather name="flag" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>
          {!!post.body && <Text numberOfLines={4} style={[styles.postBody, { color: colors.foreground }]}>{post.body}</Text>}
          {renderMedia(post.media)}
          <View style={styles.postActions}>
            <Pressable style={styles.actionText} onPress={() => toggleLike(post)}>
              <Feather name="thumbs-up" size={17} color={post.viewer?.hasLiked ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.actionLabel, { color: post.viewer?.hasLiked ? colors.primary : colors.mutedForeground }]}>
                {post.counts.likes ?? 0}
              </Text>
            </Pressable>
            <Pressable style={styles.actionText} onPress={() => toggleComments(post.id)}>
              <Feather name="message-circle" size={17} color={colors.primary} />
              <Text style={[styles.actionLabel, { color: colors.primary }]}>{post.counts.comments}</Text>
            </Pressable>
            <Pressable style={styles.actionText} onPress={() => sharePost(post)}>
              <Feather name="send" size={17} color={colors.mutedForeground} />
              <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>Share</Text>
            </Pressable>
          </View>
          {expandedPostId === post.id && (
            <View style={styles.commentsPanel}>
              <View style={styles.commentsHeader}>
                <Text style={[styles.commentsTitle, { color: colors.foreground }]}>Comments</Text>
                <Pressable style={styles.commentsCollapseButton} onPress={() => setExpandedPostId(null)}>
                  <Feather name="chevron-up" size={15} color={colors.primary} />
                  <Text style={[styles.commentsCollapseText, { color: colors.primary }]}>Collapse</Text>
                </Pressable>
              </View>
              <View style={styles.commentComposer}>
                <TextInput
                  value={commentDrafts[post.id] ?? ""}
                  onChangeText={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
                  placeholder="Add a comment"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.commentInput, { color: colors.foreground, borderColor: colors.border }]}
                />
                <Pressable style={[styles.smallButton, { backgroundColor: colors.primary }]} onPress={() => addComment(post.id)}>
                  <Feather name="send" size={15} color="#fff" />
                </Pressable>
              </View>
              {(comments[post.id] ?? []).map((comment) => renderComment(post.id, comment))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  homeHeader: { gap: 14, marginBottom: 2 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandMark: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  brandTextBlock: { flex: 1 },
  kicker: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0 },
  welcomeTitle: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 2 },
  profileButton: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  profileAvatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  heroPanel: { borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  heroCopy: { flex: 1, gap: 5 },
  heroTitle: { color: "#fff", fontSize: 23, fontFamily: "Inter_700Bold" },
  heroSubtitle: { color: "rgba(255,255,255,0.84)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  heroIconBox: { width: 58, height: 58, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  stateText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", paddingVertical: 40 },
  errorText: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center", padding: 14 },
  notice: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: "Inter_600SemiBold" },
  postCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 },
  postTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  postAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  postAvatarImage: { width: "100%", height: "100%" },
  postAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  postAuthorTextBlock: { flex: 1, minWidth: 0 },
  postAuthorName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  postAuthorMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  postTitle: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 24 },
  postMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3 },
  postBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  iconButton: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  mediaGrid: { gap: 10 },
  mediaBlock: { gap: 6 },
  imageMedia: { width: "100%", height: 210, borderRadius: 12, backgroundColor: "#111827" },
  videoMedia: { height: 150, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 7, padding: 14 },
  videoLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  caption: { fontSize: 12, fontFamily: "Inter_400Regular" },
  postActions: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(148,163,184,0.3)", paddingTop: 10 },
  actionText: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  commentsPanel: { gap: 10 },
  commentsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  commentsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  commentsCollapseButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  commentsCollapseText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  commentComposer: { flexDirection: "row", gap: 8, alignItems: "center" },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Inter_400Regular" },
  smallButton: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  commentBox: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  replyBox: { marginLeft: 18, marginTop: 8 },
  commentThreadRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  replyAvatar: { width: 30, height: 30, borderRadius: 15 },
  commentAvatarText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  commentContent: { flex: 1, minWidth: 0, gap: 4 },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_700Bold" },
  commentText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  replyComposer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  replyToggle: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingTop: 4 },
  replyToggleText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  replyInput: { flex: 1, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, fontFamily: "Inter_400Regular", fontSize: 12 },
});
