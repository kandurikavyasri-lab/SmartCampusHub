import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiUrl } from "@/utils/api";

type MediaDraft = { type: "image" | "video"; url: string; caption: string };
const EMPTY_MEDIA: MediaDraft = { type: "image", url: "", caption: "" };

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || "Request failed");
  return data;
}

export default function FeedComposeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-user-id": user?.id ?? "" }), [user?.id]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [mediaDraft, setMediaDraft] = useState<MediaDraft>(EMPTY_MEDIA);
  const [isMediaComposerOpen, setIsMediaComposerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const initials = (user?.name || "Admin").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AD";

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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.82, base64: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const type = asset.type === "video" ? "video" : "image";
      if (!asset.base64) throw new Error("Could not read the selected media.");
      const mimeType = asset.mimeType || (type === "video" ? "video/mp4" : "image/jpeg");
      const dataUrl = "data:" + mimeType + ";base64," + asset.base64;
      const data = await readJson(await fetch(getApiUrl("/api/feed/media"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({ actorUserId: user.id, type, url: dataUrl, caption: mediaDraft.caption, mimeType }),
      }));
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
      await readJson(await fetch(getApiUrl("/api/feed/posts"), {
        method: "POST",
        headers,
        body: JSON.stringify({ actorUserId: user.id, title, body, status, media }),
      }));
      router.replace("/admin/feed");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save feed post.");
    }
  };

  const renderMediaPreview = (item: MediaDraft, index: number) => (
    <View key={index} style={[styles.mediaPreview, { borderColor: colors.border, backgroundColor: colors.secondary }]}> 
      {item.type === "image" ? <Image source={{ uri: item.url }} style={styles.previewImage} /> : <Feather name="play-circle" size={30} color={colors.primary} />}
      <View style={{ flex: 1 }}>
        <Text style={[styles.mediaType, { color: colors.foreground }]}>{item.type === "image" ? "Image" : "Video"}</Text>
        {!!item.caption && <Text style={[styles.mediaCaption, { color: colors.mutedForeground }]}>{item.caption}</Text>}
      </View>
      <Pressable onPress={() => setMedia((items) => items.filter((_, i) => i !== index))}>
        <Feather name="x" size={18} color={colors.destructive} />
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 36 }]}> 
      <View style={styles.topRow}>
        <Pressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <Feather name="x" size={21} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Create Post</Text>
        <Pressable style={[styles.publishTopButton, { backgroundColor: colors.primary }]} onPress={savePost}>
          <Text style={styles.publishTopText}>Post</Text>
        </Pressable>
      </View>

      <View style={[styles.authorRow, { borderColor: colors.border }]}> 
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "22" }]}> 
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: colors.foreground }]}>{user?.name || "University Admin"}</Text>
          <Text style={[styles.authorMeta, { color: colors.mutedForeground }]}>University Administration</Text>
        </View>
      </View>

      {!!message && <Text style={[styles.message, { borderColor: colors.border, color: message.includes("Could") || message.includes("required") ? colors.destructive : colors.primary }]}>{message}</Text>}

      <TextInput value={title} onChangeText={setTitle} placeholder="Post title" placeholderTextColor={colors.mutedForeground} style={[styles.titleInput, { color: colors.foreground, borderColor: colors.border }]} />
      <TextInput value={body} onChangeText={setBody} placeholder="What do you want to share with campus?" placeholderTextColor={colors.mutedForeground} multiline style={[styles.bodyInput, { color: colors.foreground, borderColor: colors.border }]} />

      <View style={styles.segmentRow}>
        {(["draft", "published"] as const).map((item) => (
          <Pressable key={item} onPress={() => setStatus(item)} style={[styles.segment, { borderColor: colors.border, backgroundColor: status === item ? colors.primary : colors.card }]}>
            <Text style={[styles.segmentText, { color: status === item ? "#fff" : colors.foreground }]}>{item === "draft" ? "Save Draft" : "Publish Now"}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.mediaPanel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <View style={styles.optionalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Media optional</Text>
            <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Create a text-only post or upload images and videos from your device.</Text>
          </View>
          <Pressable style={[styles.attachButton, { borderColor: colors.border }]} onPress={() => setIsMediaComposerOpen((value) => !value)}>
            <Feather name={isMediaComposerOpen ? "minus" : "plus"} size={15} color={colors.primary} />
            <Text style={[styles.attachButtonText, { color: colors.primary }]}>{isMediaComposerOpen ? "Hide" : "Attach"}</Text>
          </Pressable>
        </View>
        {isMediaComposerOpen && (
          <View style={styles.mediaComposer}>
            <TextInput value={mediaDraft.caption} onChangeText={(caption) => setMediaDraft((current) => ({ ...current, caption }))} placeholder="Caption (optional)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
            <Pressable style={[styles.uploadDropButton, { borderColor: colors.border, backgroundColor: colors.secondary }]} onPress={pickAndUploadMedia}>
              <Feather name="upload-cloud" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Upload photo or video</Text>
                <Text style={[styles.uploadSubtitle, { color: colors.mutedForeground }]}>Choose media from your device. No URL required.</Text>
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {media.map(renderMediaPreview)}

      <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={savePost}>
        <Feather name="send" size={18} color="#fff" />
        <Text style={styles.primaryButtonText}>{status === "draft" ? "Save Draft" : "Publish Post"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { flex: 1, textAlign: "center", fontSize: 21, fontFamily: "Inter_700Bold" },
  publishTopButton: { minHeight: 42, borderRadius: 13, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  publishTopText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  authorRow: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  authorName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  authorMeta: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  message: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: "Inter_600SemiBold" },
  titleInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontFamily: "Inter_700Bold" },
  bodyInput: { borderWidth: 1, borderRadius: 14, minHeight: 180, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontFamily: "Inter_400Regular", textAlignVertical: "top" },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segment: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  segmentText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  mediaPanel: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  optionalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 3 },
  attachButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 6 },
  attachButtonText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  mediaComposer: { gap: 10 },
  typeButton: { borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9 },
  typeText: { fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "Inter_500Medium" },
  mediaActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  uploadDropButton: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  uploadTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  uploadSubtitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  secondaryButton: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, flexGrow: 1 },
  secondaryButtonText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  mediaPreview: { borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  previewImage: { width: 66, height: 54, borderRadius: 9, backgroundColor: "#111827" },
  mediaType: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  mediaCaption: { fontSize: 12, fontFamily: "Inter_400Regular" },
  primaryButton: { borderRadius: 14, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
