import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, shadow2, spacing } from "@/src/theme";
import { loadProgress, saveProgress } from "@/src/progress";

export default function Onboarding() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await loadProgress();
      if (p.hasOnboarded) {
        router.replace("/(tabs)");
      } else {
        setChecking(false);
      }
    })();
  }, [router]);

  const start = async () => {
    const p = await loadProgress();
    await saveProgress({ ...p, hasOnboarded: true });
    router.replace("/(tabs)");
  };

  if (checking) {
    return (
      <View style={styles.loading} testID="onboarding-loading">
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="onboarding-screen">
      <View style={[styles.imageWrap, { height: height * 0.6 }]}>
        <Image
          source="https://images.unsplash.com/photo-1710244182004-1c708b3f146d?crop=entropy&cs=srgb&fm=jpg&w=1000&q=85"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={["transparent", "rgba(250,250,247,0.6)", colors.surface]}
          locations={[0, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.badge} testID="onboarding-badge">
          <Ionicons name="bulb" size={16} color={colors.onBrandTertiary} />
          <Text style={styles.badgeText}>100 LEVELS • MASTER LOGIC</Text>
        </View>
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.bottom}>
        <Text style={styles.title} testID="onboarding-title">
          Welcome to LogIQ
        </Text>
        <Text style={styles.subtitle}>
          Solve 100 progressively harder puzzles. Sharpen pattern recognition, deduction, and
          problem-solving — with an AI coach in your pocket.
        </Text>
        <Pressable
          testID="onboarding-start-btn"
          onPress={start}
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.ctaText}>Start My Journey</Text>
          <Ionicons name="arrow-forward" size={22} color={colors.onBrandPrimary} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  imageWrap: { width: "100%", overflow: "hidden" },
  badge: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    ...shadow2,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.onBrandTertiary, letterSpacing: 1 },
  bottom: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md, justifyContent: "space-between" },
  title: { fontFamily: fonts.displayBold, fontSize: 34, color: colors.onSurface, lineHeight: 40 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, lineHeight: 22, marginTop: spacing.md },
  cta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    ...shadow2,
  },
  ctaText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onBrandPrimary },
});
