const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Puzzle = {
  level: number;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  answer: string;
  concept: string;
};

export type PuzzleMeta = { level: number; category: string; difficulty: string };

export async function fetchAllPuzzles(): Promise<PuzzleMeta[]> {
  const r = await fetch(`${BASE}/api/puzzles`);
  if (!r.ok) throw new Error("Failed to load puzzles");
  return r.json();
}

export async function fetchPuzzle(level: number): Promise<Puzzle> {
  const r = await fetch(`${BASE}/api/puzzles/${level}`);
  if (!r.ok) throw new Error("Failed to load puzzle");
  return r.json();
}

export async function fetchDailyChallenge(): Promise<Puzzle> {
  const r = await fetch(`${BASE}/api/daily-challenge`);
  if (!r.ok) throw new Error("Failed to load daily");
  return r.json();
}

// Streams AI text; caller receives chunks
export async function streamHint(level: number, onChunk: (t: string) => void): Promise<void> {
  const r = await fetch(`${BASE}/api/hint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level }),
  });
  if (!r.ok || !r.body) {
    onChunk("Hint unavailable right now.");
    return;
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export async function streamExplain(
  level: number,
  user_answer: string,
  correct: boolean,
  onChunk: (t: string) => void
): Promise<void> {
  const r = await fetch(`${BASE}/api/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, user_answer, correct }),
  });
  if (!r.ok || !r.body) {
    onChunk("Explanation unavailable right now.");
    return;
  }
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
