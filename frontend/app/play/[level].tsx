import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, radius, shadow1, shadow2, spacing, TOTAL_LEVELS } from "@/src/theme";
import { fetchPuzzle, Puzzle, streamHint } from "@/src/api";

export default function PlayScreen() {
  const { level, daily, practice } = useLocalSearchParams<{ level: string; daily?: string; practice?: string }>();
  const router = useRouter();
  const levelNum = Number(level);

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hintText, setHintText] = useState<string>("");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchPuzzle(levelNum);
      setPuzzle(p);
    } catch (e: any) {
      setError(e.message || "Failed to load puzzle");
    } finally {
      setLoading(false);
    }
  }, [levelNum]);

  useEffect(() => {
    load();
  }, [load]);

  const openHint = async () => {
    if (hintOpen) {
      setHintOpen(false);
      return;
    }
    setHintOpen(true);
    if (hintText) return; // cached
    setHintLoading(true);
    setHintText("");
    try {
      await streamHint(levelNum, (chunk) => setHintText((prev) => prev + chunk));
    } catch {
      setHintText("Hint unavailable right now.");
    } finally {
      setHintLoading(false);
    }
  };

  const submit = () => {
    if (!selected || !puzzle) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const correct = selected === puzzle.answer;
    router.replace(
      `/complete/${levelNum}?correct=${correct ? 1 : 0}&picked=${encodeURIComponent(selected)}${
        daily ? "&daily=1" : ""
      }${practice ? "&practice=1" : ""}`
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  if (error || !puzzle) {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.errorText}>{error || "No puzzle"}</Text>
        <Pressable style={styles.retryBtn} onPress={load} testID="play-retry">
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progressPct = Math.round((levelNum / TOTAL_LEVELS) * 100);

  return (
    <View style={styles.root} testID={`play-screen-${levelNum}`}>
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={12}
            testID="play-back-btn"
          >
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </Pressable>
          <View style={styles.progressWrap}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Pressable onPress={openHint} style={styles.iconBtn} hitSlop={12} testID="play-hint-btn">
            <Ionicons name="bulb" size={22} color={colors.warning} />
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.levelTag}>Level {levelNum}</Text>
          <View style={styles.diffChip}>
            <Text style={styles.diffText}>{puzzle.difficulty.toUpperCase()}</Text>
          </View>
          <View style={[styles.diffChip, { backgroundColor: colors.surfaceTertiary }]}>
            <Text style={styles.diffText}>{puzzle.category.replace("_", " ")}</Text>
          </View>
          {practice ? (
            <View style={[styles.diffChip, { backgroundColor: colors.brandPrimary }]} testID="practice-tag">
              <Text style={[styles.diffText, { color: colors.onBrandPrimary }]}>practice</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard} testID="puzzle-question">
          <Text style={styles.questionText}>{puzzle.question}</Text>
        </View>

        {hintOpen && (
          <View style={styles.hintCard} testID="hint-card">
            <View style={styles.hintHeader}>
              <Ionicons name="bulb" size={16} color={colors.warning} />
              <Text style={styles.hintTitle}>AI Hint</Text>
              {hintLoading && <ActivityIndicator size="small" color={colors.warning} />}
            </View>
            <Text style={styles.hintBody}>{hintText || "…thinking"}</Text>
          </View>
        )}

        <View style={styles.optionsWrap}>
          {puzzle.options.map((opt, i) => {
            const isSelected = selected === opt;
            return (
              <Pressable
                key={`${i}-${opt}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelected(opt);
                }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                testID={`option-${i}`}
              >
                <View style={[styles.optionBullet, isSelected && styles.optionBulletSelected]}>
                  <Text style={[styles.optionBulletText, isSelected && { color: colors.onBrandPrimary }]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && { color: colors.onBrandPrimary }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <Pressable
          disabled={!selected}
          onPress={submit}
          style={({ pressed }) => [
            styles.submit,
            !selected && styles.submitDisabled,
            pressed && selected && { transform: [{ scale: 0.97 }] },
          ]}
          testID="submit-answer-btn"
        >
          <Text style={styles.submitText}>Submit</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", gap: spacing.md },
  errorText: { fontFamily: fonts.body, color: colors.error },
  retryBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  retryText: { fontFamily: fonts.displayBold, color: colors.onBrandPrimary },
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.brandPrimary, borderRadius: radius.pill },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignItems: "center" },
  levelTag: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.onSurface },
  diffChip: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  diffText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.onSurface, letterSpacing: 0.5, textTransform: "capitalize" },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  questionCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow2,
  },
  questionText: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26, color: colors.onSurface },
  hintCard: {
    backgroundColor: "#FEF9C3",
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brandTertiary,
  },
  hintHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  hintTitle: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.onSurface, flex: 1 },
  hintBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onSurface },
  optionsWrap: { gap: spacing.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow1,
  },
  optionSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.success },
  optionBullet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBulletSelected: { backgroundColor: "rgba(255,255,255,0.25)" },
  optionBulletText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.onSurface },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onSurface, flex: 1 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
  submit: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.sm,
    ...shadow2,
  },
  submitDisabled: { backgroundColor: colors.borderStrong },
  submitText: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.onBrandPrimary },
});
