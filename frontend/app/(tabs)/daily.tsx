import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, radius, shadow2, spacing } from "@/src/theme";
import { fetchDailyChallenge, Puzzle } from "@/src/api";
import { loadProgress, Progress, todayUTC } from "@/src/progress";

export default function DailyScreen() {
  const router = useRouter();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, prog] = await Promise.all([fetchDailyChallenge(), loadProgress()]);
      setPuzzle(p);
      setProgress(prog);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  const alreadyDone = progress?.dailyChallenges.includes(todayUTC());

  return (
    <View style={styles.root} testID="daily-screen">
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <Text style={styles.title}>Daily Challenge</Text>
        <Text style={styles.subtitle}>One special puzzle each day. Keep your streak alive!</Text>
      </SafeAreaView>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={colors.brandPrimary} size="large" />
        ) : error ? (
          <View>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retry} onPress={load} testID="daily-retry">
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : puzzle ? (
          <View style={styles.hero} testID="daily-hero">
            <Image
              source="https://images.unsplash.com/photo-1617791160536-598cf32026fb?crop=entropy&cs=srgb&fm=jpg&w=1000&q=85"
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={["transparent", "rgba(26,28,25,0.75)", colors.surfaceInverse]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <View style={styles.tag}>
                <Ionicons name="calendar" size={12} color={colors.onSurfaceInverse} />
                <Text style={styles.tagText}>TODAY • {todayUTC()}</Text>
              </View>
              <Text style={styles.heroTitle}>{puzzle.category.replace("_", " ").toUpperCase()}</Text>
              <Text style={styles.heroSubtitle}>Difficulty · {puzzle.difficulty}</Text>
              <Text style={styles.heroQuestion}>{puzzle.question}</Text>

              <Pressable
                testID="daily-start-btn"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/play/${puzzle.level}?daily=1`);
                }}
                style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <Text style={styles.ctaText}>{alreadyDone ? "Play Again" : "Solve Now"}</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.onBrandPrimary} />
              </Pressable>
              {alreadyDone && (
                <View style={styles.doneChip} testID="daily-done-chip">
                  <Ionicons name="checkmark-circle" size={14} color={colors.brandPrimary} />
                  <Text style={styles.doneText}>Completed today</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.onSurface, marginTop: spacing.sm },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  body: { flex: 1, padding: spacing.xl },
  hero: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    justifyContent: "flex-end",
    ...shadow2,
  },
  heroContent: { padding: spacing.xl, gap: spacing.sm },
  tag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(250,250,247,0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, color: colors.onSurfaceInverse },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.onSurfaceInverse },
  heroSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.onSurfaceInverse, opacity: 0.85 },
  heroQuestion: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurfaceInverse,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.xl,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  ctaText: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.onBrandPrimary },
  doneChip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  doneText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurfaceInverse },
  errorText: { fontFamily: fonts.body, color: colors.error, textAlign: "center", marginBottom: spacing.md },
  retry: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  retryText: { fontFamily: fonts.displayBold, color: colors.onBrandPrimary },
});
