import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { colors, fonts, radius, shadow1, shadow2, spacing, TOTAL_LEVELS } from "@/src/theme";
import { isUnlocked, loadProgress, nextLevel, Progress } from "@/src/progress";

const NODE_SIZE = 76;
const ROW_HEIGHT = 112;
// Zig-zag offset amplitude
const OFFSET = 90;

function xForLevel(level: number) {
  // Sine-like winding
  const t = ((level - 1) % 8) / 8;
  const phase = Math.sin(t * Math.PI * 2);
  return phase * OFFSET;
}

function zoneForLevel(level: number): { label: string; color: string } {
  if (level <= 20) return { label: "Sprout", color: colors.brandPrimary };
  if (level <= 50) return { label: "Growth", color: colors.brandTertiary };
  if (level <= 80) return { label: "Ascent", color: colors.brandSecondary };
  return { label: "Summit", color: colors.surfaceInverse };
}

export default function LevelsMap() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    const p = await loadProgress();
    setProgress(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!progress) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  const current = nextLevel(progress);
  const levels = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);

  const handlePress = async (level: number, unlocked: boolean, completed: boolean) => {
    if (!unlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Completed levels open in Practice Mode (no streak/XP impact)
    router.push(completed ? `/play/${level}?practice=1` : `/play/${level}`);
  };

  return (
    <View style={styles.root} testID="levels-map">
      {/* Sticky header */}
      <SafeAreaView edges={["top"]} style={styles.headerWrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hiText}>Your Journey</Text>
            <Text style={styles.hiSub}>
              {progress.completedLevels.length}/{TOTAL_LEVELS} levels • Zone: {zoneForLevel(current).label}
            </Text>
          </View>
          <View style={styles.headerStats}>
            <View style={[styles.pill, { backgroundColor: colors.brandTertiary }]} testID="header-xp">
              <Ionicons name="star" size={14} color={colors.onBrandTertiary} />
              <Text style={styles.pillText}>{progress.xp}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.brandSecondary }]} testID="header-streak">
              <Ionicons name="flame" size={14} color={colors.onBrandSecondary} />
              <Text style={[styles.pillText, { color: colors.onBrandSecondary }]}>{progress.streak}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {levels.map((lvl) => {
          const completed = progress.completedLevels.includes(lvl);
          const unlocked = isUnlocked(lvl, progress);
          const isCurrent = lvl === current;
          const offset = xForLevel(lvl);
          const zone = zoneForLevel(lvl);

          const bg = completed
            ? colors.brandPrimary
            : isCurrent
            ? colors.brandTertiary
            : unlocked
            ? colors.surface
            : colors.surfaceSecondary;
          const fg = completed
            ? colors.onBrandPrimary
            : isCurrent
            ? colors.onBrandTertiary
            : unlocked
            ? colors.onSurface
            : colors.muted;

          return (
            <View key={lvl} style={[styles.row, { transform: [{ translateX: offset }] }]}>
              {lvl % 20 === 1 && (
                <View style={[styles.zoneChip, { backgroundColor: zone.color }]}>
                  <Text style={[styles.zoneText, { color: lvl > 80 ? colors.onSurfaceInverse : colors.onSurface }]}>
                    {zone.label} Zone
                  </Text>
                </View>
              )}
              <Pressable
                testID={`level-node-${lvl}`}
                onPress={() => handlePress(lvl, unlocked, completed)}
                style={({ pressed }) => [
                  styles.node,
                  {
                    backgroundColor: bg,
                    borderColor: completed ? colors.success : isCurrent ? colors.warning : colors.borderStrong,
                    transform: [{ scale: pressed && unlocked ? 0.93 : isCurrent ? 1.08 : 1 }],
                  },
                  isCurrent && shadow2,
                  !isCurrent && shadow1,
                ]}
              >
                {completed ? (
                  <Ionicons name="checkmark" size={30} color={fg} />
                ) : !unlocked ? (
                  <Ionicons name="lock-closed" size={22} color={fg} />
                ) : (
                  <Text style={[styles.nodeText, { color: fg }]}>{lvl}</Text>
                )}
              </Pressable>
              {isCurrent && (
                <View style={styles.playHint} testID="current-level-hint">
                  <Text style={styles.playHintText}>START</Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: spacing["3xl"] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerWrap: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    zIndex: 5,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hiText: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.onSurface },
  hiSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  headerStats: { flexDirection: "row", gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pillText: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.onBrandTertiary },
  scroll: { paddingTop: spacing.xl, paddingBottom: spacing["2xl"], alignItems: "center" },
  row: {
    height: ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeText: { fontFamily: fonts.displayBold, fontSize: 24 },
  zoneChip: {
    position: "absolute",
    top: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.pill,
    zIndex: 2,
    ...shadow1,
  },
  zoneText: { fontFamily: fonts.displayBold, fontSize: 11, letterSpacing: 1 },
  playHint: {
    position: "absolute",
    bottom: 6,
    backgroundColor: colors.surfaceInverse,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  playHintText: { fontFamily: fonts.displayBold, fontSize: 10, color: colors.onSurfaceInverse, letterSpacing: 1 },
});
