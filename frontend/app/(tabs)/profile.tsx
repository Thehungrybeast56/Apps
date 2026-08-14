import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, shadow1, shadow2, spacing, TOTAL_LEVELS } from "@/src/theme";
import { BADGE_LABELS, categoryMastery, loadProgress, Progress, resetProgress } from "@/src/progress";

const ALL_BADGES = Object.keys(BADGE_LABELS);

export default function ProfileScreen() {
  const [progress, setProgress] = useState<Progress | null>(null);

  const refresh = useCallback(async () => {
    const p = await loadProgress();
    setProgress(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (!progress) return null;

  const percent = Math.round((progress.completedLevels.length / TOTAL_LEVELS) * 100);

  const handleReset = () => {
    Alert.alert(
      "Reset progress?",
      "This will wipe XP, streak, badges, and completed levels.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetProgress();
            await refresh();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root} testID="profile-screen">
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <Text style={styles.title}>Profile</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={styles.card} testID="profile-card">
          <View style={styles.avatarWrap}>
            <Image
              source="https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?crop=entropy&cs=srgb&fm=jpg&w=400&q=85"
              style={styles.avatar}
              contentFit="cover"
            />
          </View>
          <Text style={styles.name}>Logic Learner</Text>
          <Text style={styles.subtitle}>Mastering reasoning, one puzzle at a time</Text>

          <View style={styles.progressBarWrap}>
            <View style={[styles.progressBar, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress.completedLevels.length}/{TOTAL_LEVELS} levels ({percent}%)
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat icon="star" label="XP" value={String(progress.xp)} bg={colors.brandTertiary} fg={colors.onBrandTertiary} testID="stat-xp" />
          <Stat icon="flame" label="Streak" value={`${progress.streak}d`} bg={colors.brandSecondary} fg={colors.onBrandSecondary} testID="stat-streak" />
          <Stat icon="ribbon" label="Badges" value={String(progress.badges.length)} bg={colors.brandPrimary} fg={colors.onBrandPrimary} testID="stat-badges" />
        </View>

        {/* Concept Tracker */}
        <Text style={styles.section}>Concept Mastery</Text>
        {(() => {
          const mastery = categoryMastery(progress);
          const played = mastery.filter((m) => m.attempts > 0);
          if (played.length === 0) {
            return (
              <View style={styles.emptyConcept} testID="concept-empty">
                <Ionicons name="analytics-outline" size={28} color={colors.muted} />
                <Text style={styles.emptyConceptText}>
                  Solve puzzles to reveal your strongest and weakest reasoning skills.
                </Text>
              </View>
            );
          }
          const sorted = [...played].sort((a, b) => b.accuracy - a.accuracy);
          const strongest = sorted[0];
          const weakest = sorted[sorted.length - 1];
          const barColor = (acc: number) =>
            acc >= 70 ? colors.brandPrimary : acc >= 40 ? colors.warning : colors.brandSecondary;
          return (
            <View style={styles.conceptWrap} testID="concept-tracker">
              <View style={styles.insightRow}>
                <View style={[styles.insightCard, { backgroundColor: colors.surfaceSecondary }]} testID="concept-strongest">
                  <View style={styles.insightHead}>
                    <Ionicons name="trending-up" size={14} color={colors.success} />
                    <Text style={styles.insightLabel}>Strongest</Text>
                  </View>
                  <Text style={styles.insightValue}>{strongest.label}</Text>
                  <Text style={styles.insightPct}>{strongest.accuracy}%</Text>
                </View>
                <View style={[styles.insightCard, { backgroundColor: colors.surfaceSecondary }]} testID="concept-weakest">
                  <View style={styles.insightHead}>
                    <Ionicons name="trending-down" size={14} color={colors.error} />
                    <Text style={styles.insightLabel}>Focus Next</Text>
                  </View>
                  <Text style={styles.insightValue}>{weakest.label}</Text>
                  <Text style={styles.insightPct}>{weakest.accuracy}%</Text>
                </View>
              </View>

              {sorted.map((m) => (
                <View key={m.category} style={styles.conceptRow} testID={`concept-${m.category}`}>
                  <View style={styles.conceptTop}>
                    <Text style={styles.conceptName}>{m.label}</Text>
                    <Text style={styles.conceptMeta}>
                      {m.correct}/{m.attempts} · {m.accuracy}%
                    </Text>
                  </View>
                  <View style={styles.conceptBarBg}>
                    <View
                      style={[styles.conceptBarFill, { width: `${m.accuracy}%`, backgroundColor: barColor(m.accuracy) }]}
                    />
                  </View>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Badges */}
        <Text style={styles.section}>Badges</Text>
        <View style={styles.badgeGrid}>
          {ALL_BADGES.map((id) => {
            const earned = progress.badges.includes(id);
            return (
              <View
                key={id}
                style={[styles.badge, earned ? styles.badgeEarned : styles.badgeLocked]}
                testID={`badge-${id}`}
              >
                <Ionicons
                  name={earned ? "trophy" : "lock-closed"}
                  size={26}
                  color={earned ? colors.onBrandTertiary : colors.muted}
                />
                <Text style={[styles.badgeLabel, { color: earned ? colors.onBrandTertiary : colors.muted }]}>
                  {BADGE_LABELS[id]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Reset */}
        <Pressable style={styles.resetBtn} onPress={handleReset} testID="reset-progress-btn">
          <Ionicons name="refresh" size={16} color={colors.error} />
          <Text style={styles.resetText}>Reset progress</Text>
        </Pressable>

        <View style={{ height: spacing["3xl"] }} />
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label, value, bg, fg, testID }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]} testID={testID}>
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg, opacity: 0.85 }]}>{label}</Text>
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
  scroll: { padding: spacing.xl, gap: spacing.lg },
  card: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    ...shadow1,
  },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
    borderWidth: 4,
    borderColor: colors.brandTertiary,
    ...shadow2,
  },
  avatar: { width: "100%", height: "100%" },
  name: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.onSurface, marginTop: spacing.md },
  subtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  progressBarWrap: {
    width: "100%",
    height: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: colors.brandPrimary, borderRadius: radius.pill },
  progressText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurface, marginTop: 6 },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: 2,
    ...shadow1,
  },
  statValue: { fontFamily: fonts.displayBold, fontSize: 22 },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 11 },
  section: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onSurface, marginTop: spacing.sm },
  emptyConcept: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyConceptText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 },
  conceptWrap: { gap: spacing.md },
  insightRow: { flexDirection: "row", gap: spacing.md },
  insightCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, gap: 2 },
  insightHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  insightLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted, letterSpacing: 0.5 },
  insightValue: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.onSurface },
  insightPct: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
  conceptRow: { gap: 6 },
  conceptTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  conceptName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onSurface },
  conceptMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  conceptBarBg: { height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, overflow: "hidden" },
  conceptBarFill: { height: "100%", borderRadius: radius.pill },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  badge: {
    width: "47%",
    aspectRatio: 1.6,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  badgeEarned: { backgroundColor: colors.brandTertiary },
  badgeLocked: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  badgeLabel: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: "center" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  resetText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.error },
});
