import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

type FeedPost = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  media: Array<{ id: string; type: "image" | "video"; url: string; caption?: string | null }>;
  counts: { comments: number; reports: number };
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data;
}

export default function FeedControlsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-user-id": user?.id ?? "" }), [user?.id]);

  const loadPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const query = filter === "all" ? "" : "&status=" + filter;
      const data = await readJson(await fetch(getApiUrl("/api/feed/posts?limit=50&actorUserId=" + user.id + query), { headers }));
      setPosts(data.posts ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load feed controls.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter, headers]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const postAction = async (postId: string, action: "publish" | "archive" | "delete") => {
    if (!user) return;
    try {
      const url = getApiUrl(action === "delete" ? "/api/feed/posts/" + postId : "/api/feed/posts/" + postId + "/" + action);
      await readJson(await fetch(url, { method: action === "delete" ? "DELETE" : "POST", headers, body: JSON.stringify({ actorUserId: user.id }) }));
      setMessage(action === "delete" ? "Post deleted." : "Post " + action + "d.");
      await loadPosts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed.");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 36 }]}> 
      <View style={styles.screenTopRow}>
        <Pressable style={[styles.roundIconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/admin/feed")}>
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Feed Controls</Text>
        <Pressable style={[styles.roundIconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/admin/feed")}>
          <Feather name="home" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>Post Administration</Text>
        <Text style={[styles.panelText, { color: colors.mutedForeground }]}>Manage drafts, published posts, and archived announcements without cluttering the public feed.</Text>
      </View>

      {!!message && <Text style={[styles.message, { borderColor: colors.border, color: message.includes("failed") || message.includes("Could") ? colors.destructive : colors.primary }]}>{message}</Text>}

      <View style={styles.filterRow}>
        {["all", "draft", "published", "archived"].map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, { borderColor: colors.border, backgroundColor: filter === item ? colors.primary : colors.card }]}>
            <Text style={[styles.filterText, { color: filter === item ? "#fff" : colors.foreground }]}>{item[0].toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading posts...</Text> : null}
      {!loading && posts.length === 0 ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts found for this status.</Text> : null}

      {posts.map((post) => (
        <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={styles.postHeader}>
            {post.media[0]?.type === "image" ? <Image source={{ uri: post.media[0].url }} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.videoThumb, { backgroundColor: colors.secondary }]}><Feather name="file-text" size={18} color={colors.primary} /></View>}
            <View style={{ flex: 1 }}>
              <Text style={[styles.postTitle, { color: colors.foreground }]}>{post.title}</Text>
              <Text style={[styles.postMeta, { color: colors.mutedForeground }]}>{post.status} - {post.counts.comments} comments - {post.counts.reports} reports</Text>
            </View>
          </View>
          {!!post.body && <Text numberOfLines={3} style={[styles.postBody, { color: colors.foreground }]}>{post.body}</Text>}
          <View style={styles.actionRow}>
            {post.status !== "published" && <Pressable style={[styles.smallAction, { backgroundColor: colors.primary }]} onPress={() => postAction(post.id, "publish")}><Text style={styles.smallActionText}>Publish</Text></Pressable>}
            {post.status !== "archived" && <Pressable style={[styles.smallAction, { backgroundColor: "#64748B" }]} onPress={() => postAction(post.id, "archive")}><Text style={styles.smallActionText}>Archive</Text></Pressable>}
            <Pressable style={[styles.smallAction, { backgroundColor: colors.destructive }]} onPress={() => postAction(post.id, "delete")}><Text style={styles.smallActionText}>Delete</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  screenTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  screenTitle: { flex: 1, textAlign: "center", fontSize: 21, fontFamily: "Inter_700Bold" },
  roundIconButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 5 },
  panelTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  panelText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  message: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: "Inter_600SemiBold" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  filterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyText: { textAlign: "center", paddingVertical: 24, fontFamily: "Inter_600SemiBold" },
  postCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  thumbnail: { width: 48, height: 48, borderRadius: 12 },
  videoThumb: { alignItems: "center", justifyContent: "center" },
  postTitle: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 21 },
  postMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 3, textTransform: "capitalize" },
  postBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallAction: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  smallActionText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
});
