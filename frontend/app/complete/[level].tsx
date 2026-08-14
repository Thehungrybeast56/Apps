import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming, withRepeat, withDelay } from "react-native-reanimated";
import ConfettiCannon from "react-native-confetti-cannon";

import { colors, fonts, radius, shadow2, spacing } from "@/src/theme";
import { fetchPuzzle, Puzzle, streamExplain } from "@/src/api";
import { completeLevel, loadProgress, markDailyDone, recordAttempt, saveProgress, xpForLevel } from "@/src/progress";
import { playSuccess, playWrong } from "@/src/sounds";

const MASCOT = "https://images.unsplash.com/photo-1638803040283-7a5ffd48dad5?crop=entropy&cs=srgb&fm=jpg&w=400&q=85";

export default function CompleteScreen() {
  const { level, correct, picked, daily, practice } = useLocalSearchParams<{
    level: string;
    correct: string;
    picked: string;
    daily?: string;
    practice?: string;
  }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const levelNum = Number(level);
  const isCorrect = correct === "1";
  const isDaily = daily === "1";
  const isPractice = practice === "1";

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [explain, setExplain] = useState("");
  const [explainLoading, setExplainLoading] = useState(true);
  const [xpGain, setXpGain] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const init = useCallback(async () => {
    const p = await fetchPuzzle(levelNum);
    setPuzzle(p);

    const prev = await loadProgress();
    // Always record the attempt for the concept tracker
    let next = recordAttempt(prev, p.category, isCorrect);

    if (isCorrect && !isPractice) {
      const alreadyDone = prev.completedLevels.includes(levelNum);
      const badgesBefore = new Set(prev.badges);
      next = completeLevel(next, levelNum);
      if (isDaily) next = markDailyDone(next);
      setXpGain(alreadyDone ? 0 : xpForLevel(levelNum));
      setNewBadges(next.badges.filter((b) => !badgesBefore.has(b)));
    }
    await saveProgress(next);

    // Celebration FX
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSuccess();
      setShowConfetti(true);
      scale.value = withSequence(withSpring(1.15, { damping: 6 }), withSpring(1, { damping: 8 }));
      rotate.value = withDelay(200, withSequence(
        withTiming(-8, { duration: 120 }),
        withRepeat(withSequence(withTiming(8, { duration: 240 }), withTiming(-8, { duration: 240 })), 3, true),
        withTiming(0, { duration: 120 })
      ));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      playWrong();
      scale.value = withSpring(1, { damping: 10 });
    }

    // stream explanation
    try {
      await streamExplain(levelNum, picked || "", isCorrect, (chunk) =>
        setExplain((prevTxt) => prevTxt + chunk)
      );
    } catch {
      setExplain((prevTxt) => prevTxt || "Explanation unavailable.");
    } finally {
      setExplainLoading(false);
    }
  }, [levelNum, isCorrect, picked, isDaily, isPractice]);

  useEffect(() => {
    init();
  }, [init]);

  const goHome = () => router.replace("/(tabs)");
  const retry = () => router.replace(`/play/${levelNum}${isDaily ? "?daily=1" : isPractice ? "?practice=1" : ""}`);
  const nextLevel = () => router.replace(`/play/${levelNum + 1}`);

  return (
    <View style={styles.root} testID={`complete-screen-${levelNum}`}>
      {showConfetti && (
        <ConfettiCannon
          count={120}
          origin={{ x: width / 2, y: -20 }}
          fadeOut
          autoStart
          explosionSpeed={350}
          fallSpeed={2800}
          colors={[colors.brandPrimary, colors.brandTertiary, colors.brandSecondary, colors.success]}
        />
      )}
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isPractice && (
            <View style={styles.practiceBanner} testID="practice-banner">
              <Ionicons name="barbell" size={14} color={colors.onSurface} />
              <Text style={styles.practiceBannerText}>Practice Mode · streak & XP unchanged</Text>
            </View>
          )}

          <Animated.View
            style={[
              styles.mascotWrap,
              { borderColor: isCorrect ? colors.brandPrimary : colors.brandSecondary },
              mascotStyle,
            ]}
            testID="result-mascot"
          >
            <Image source={MASCOT} style={styles.mascot} contentFit="cover" />
            <View style={[styles.resultPin, { backgroundColor: isCorrect ? colors.brandPrimary : colors.brandSecondary }]}>
              <Ionicons name={isCorrect ? "checkmark" : "close"} size={22} color="#fff" />
            </View>
          </Animated.View>

          <Text style={styles.headline} testID="result-headline">
            {isCorrect ? "Brilliant!" : "Not Quite"}
          </Text>
          <Text style={styles.subline}>
            {isCorrect
              ? isPractice
                ? "Nice refresher — concept sharpened."
                : isDaily
                ? "Daily challenge conquered."
                : `Level ${levelNum} solved.`
              : "The correct answer is highlighted below."}
          </Text>

          {isCorrect && !isPractice && xpGain > 0 && (
            <View style={styles.xpChip} testID="xp-chip">
              <Ionicons name="star" size={18} color={colors.onBrandTertiary} />
              <Text style={styles.xpText}>+{xpGain} XP</Text>
            </View>
          )}

          {puzzle && (
            <View style={styles.answerCard}>
              <Text style={styles.answerLabel}>Correct answer</Text>
              <Text style={styles.answerValue} testID="correct-answer">
                {puzzle.answer}
              </Text>
              <Text style={styles.conceptLabel}>Concept</Text>
              <Text style={styles.conceptValue}>{puzzle.concept}</Text>
            </View>
          )}

          <View style={styles.explainCard} testID="explanation-card">
            <View style={styles.explainHeader}>
              <Ionicons name="sparkles" size={16} color={colors.brandPrimary} />
              <Text style={styles.explainTitle}>Coach's Note</Text>
              {explainLoading && <ActivityIndicator size="small" color={colors.brandPrimary} />}
            </View>
            <Text style={styles.explainBody}>{explain || "…"}</Text>
          </View>

          {newBadges.length > 0 && (
            <View style={styles.badgeAlert} testID="new-badges">
              <Ionicons name="ribbon" size={18} color={colors.onBrandTertiary} />
              <Text style={styles.badgeAlertText}>
                New badge{newBadges.length > 1 ? "s" : ""} earned!
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {isCorrect ? (
            <>
              <Pressable style={styles.secondaryBtn} onPress={goHome} testID="back-map-btn">
                <Text style={styles.secondaryText}>{isPractice ? "Done" : "Map"}</Text>
              </Pressable>
              <Pressable
                style={styles.primaryBtn}
                onPress={isPractice || levelNum >= 100 ? goHome : nextLevel}
                testID="continue-btn"
              >
                <Text style={styles.primaryText}>
                  {isPractice ? "Back to Practice" : levelNum < 100 ? "Next Level" : "Finish"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.onBrandPrimary} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.secondaryBtn} onPress={goHome} testID="back-map-btn">
                <Text style={styles.secondaryText}>Map</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={retry} testID="retry-btn">
                <Text style={styles.primaryText}>Try Again</Text>
                <Ionicons name="refresh" size={20} color={colors.onBrandPrimary} />
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.xl, alignItems: "center", gap: spacing.md },
  practiceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  practiceBannerText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onSurface },
  mascotWrap: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    overflow: "visible",
    ...shadow2,
  },
  mascot: { width: 118, height: 118, borderRadius: 59 },
  resultPin: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.surface,
  },
  headline: { fontFamily: fonts.displayBold, fontSize: 32, color: colors.onSurface, marginTop: spacing.md },
  subline: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: "center" },
  xpChip: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    ...shadow2,
  },
  xpText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onBrandTertiary },
  answerCard: {
    width: "100%",
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    gap: 4,
  },
  answerLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted, letterSpacing: 1 },
  answerValue: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.onSurface },
  conceptLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted, letterSpacing: 1, marginTop: spacing.sm },
  conceptValue: { fontFamily: fonts.body, fontSize: 14, color: colors.onSurface, lineHeight: 20 },
  explainCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  explainHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  explainTitle: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.onSurface, flex: 1 },
  explainBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.onSurface },
  badgeAlert: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeAlertText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.onBrandTertiary },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    backgroundColor: colors.surface,
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.onSurface },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    ...shadow2,
  },
  primaryText: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.onBrandPrimary },
});
