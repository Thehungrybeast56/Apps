import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "logiq_progress_v1";

export type CategoryStat = { correct: number; attempts: number };

export type Progress = {
  completedLevels: number[]; // sorted asc
  xp: number;
  streak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD UTC
  badges: string[];
  dailyChallenges: string[]; // YYYY-MM-DD list of completed daily challenges
  hasOnboarded: boolean;
  categoryStats: Record<string, CategoryStat>;
};

const DEFAULT: Progress = {
  completedLevels: [],
  xp: 0,
  streak: 0,
  lastPlayedDate: null,
  badges: [],
  dailyChallenges: [],
  hasOnboarded: false,
  categoryStats: {},
};

export const CATEGORY_LABELS: Record<string, string> = {
  pattern: "Pattern Recognition",
  sequence: "Sequences",
  math: "Math & Numbers",
  riddle: "Riddles",
  deduction: "Deduction",
  spatial: "Spatial Reasoning",
  logic_grid: "Logic Grids",
  lateral: "Lateral Thinking",
};

export function recordAttempt(prev: Progress, category: string, correct: boolean): Progress {
  const stats = { ...(prev.categoryStats || {}) };
  const cur = stats[category] || { correct: 0, attempts: 0 };
  stats[category] = {
    correct: cur.correct + (correct ? 1 : 0),
    attempts: cur.attempts + 1,
  };
  return { ...prev, categoryStats: stats };
}

export type CategoryMastery = {
  category: string;
  label: string;
  correct: number;
  attempts: number;
  accuracy: number; // 0-100
};

export function categoryMastery(p: Progress): CategoryMastery[] {
  const stats = p.categoryStats || {};
  return Object.keys(CATEGORY_LABELS).map((cat) => {
    const s = stats[cat] || { correct: 0, attempts: 0 };
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      correct: s.correct,
      attempts: s.attempts,
      accuracy: s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0,
    };
  });
}

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

export async function resetProgress(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

const BADGE_RULES: { id: string; label: string; check: (p: Progress) => boolean }[] = [
  { id: "first_step", label: "First Step", check: (p) => p.completedLevels.length >= 1 },
  { id: "streak_3", label: "3-Day Streak", check: (p) => p.streak >= 3 },
  { id: "streak_7", label: "Week Warrior", check: (p) => p.streak >= 7 },
  { id: "level_10", label: "Rookie Solver", check: (p) => p.completedLevels.length >= 10 },
  { id: "level_25", label: "Sharp Mind", check: (p) => p.completedLevels.length >= 25 },
  { id: "level_50", label: "Half Genius", check: (p) => p.completedLevels.length >= 50 },
  { id: "level_75", label: "Puzzle Pro", check: (p) => p.completedLevels.length >= 75 },
  { id: "level_100", label: "Logic Master", check: (p) => p.completedLevels.length >= 100 },
  { id: "daily_5", label: "Daily Devotee", check: (p) => p.dailyChallenges.length >= 5 },
];

export function evaluateBadges(p: Progress): string[] {
  const earned = new Set(p.badges);
  for (const b of BADGE_RULES) if (b.check(p)) earned.add(b.id);
  return Array.from(earned);
}

export const BADGE_LABELS: Record<string, string> = Object.fromEntries(
  BADGE_RULES.map((b) => [b.id, b.label])
);

export function xpForLevel(level: number): number {
  if (level <= 20) return 10;
  if (level <= 50) return 20;
  if (level <= 80) return 35;
  return 60;
}

export function completeLevel(prev: Progress, level: number): Progress {
  const today = todayUTC();
  const already = prev.completedLevels.includes(level);
  const completedLevels = already
    ? prev.completedLevels
    : [...prev.completedLevels, level].sort((a, b) => a - b);
  const gainedXp = already ? 0 : xpForLevel(level);

  // streak update
  let streak = prev.streak;
  if (prev.lastPlayedDate === today) {
    // same day, keep
  } else if (prev.lastPlayedDate && diffDays(prev.lastPlayedDate, today) === 1) {
    streak = prev.streak + 1;
  } else {
    streak = 1;
  }

  const next: Progress = {
    ...prev,
    completedLevels,
    xp: prev.xp + gainedXp,
    streak,
    lastPlayedDate: today,
  };
  next.badges = evaluateBadges(next);
  return next;
}

export function markDailyDone(prev: Progress): Progress {
  const today = todayUTC();
  if (prev.dailyChallenges.includes(today)) return prev;
  const next: Progress = { ...prev, dailyChallenges: [...prev.dailyChallenges, today] };
  next.badges = evaluateBadges(next);
  return next;
}

export function nextLevel(p: Progress): number {
  for (let i = 1; i <= 100; i++) if (!p.completedLevels.includes(i)) return i;
  return 100;
}

export function isUnlocked(level: number, p: Progress): boolean {
  if (level === 1) return true;
  return p.completedLevels.includes(level - 1) || p.completedLevels.includes(level);
}
