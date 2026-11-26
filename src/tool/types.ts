export type SplitMode = 'teams' | 'size';

export interface HistoryEntry {
  /** Short human readable description of the split. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Raw name input: one name per line or comma separated. */
  names: string;
  /** Raw exclude (hold-out) input: one name per line or comma separated. */
  exclude: string;
  /** 'teams' splits into a fixed number of teams; 'size' targets a team size. */
  mode: SplitMode;
  /** 'teams' mode: number of teams. */
  teamCount: number;
  /** 'size' mode: target players per team. */
  teamSize: number;
  /** Optional seed for reproducible shuffles; empty means random. */
  seed: string;
  /** Last computed split, newest first per team order. */
  teams: string[][];
  /** Saved split history, newest first. */
  history: HistoryEntry[];
}

export const MIN_TEAM_COUNT = 2;
export const MAX_TEAM_COUNT = 20;
export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 50;
export const MAX_HISTORY = 20;

export const DEFAULT_STATE: ToolState = {
  names: '',
  exclude: '',
  mode: 'teams',
  teamCount: 2,
  teamSize: 4,
  seed: '',
  teams: [],
  history: [],
};

/**
 * Parse a name list: splits on newlines and commas, trims each name,
 * drops empties and case-insensitive duplicates while keeping first occurrence order.
 */
export function parseNames(input: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const raw of input.split(/[\n,]+/)) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/** Determine which of the exclude names are actually present in the roster (case-insensitive). */
export function resolveExclusions(names: string[], excludeInput: string): string[] {
  const excluded = new Set(parseNames(excludeInput).map((n) => n.toLowerCase()));
  return names.filter((n) => excluded.has(n.toLowerCase()));
}

/** FNV-1a 32-bit hash of a string. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 PRNG factory returning a function in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle. The seed incorporates both the explicit
 * seed and the roster, so the same seed + roster always yields the same order.
 */
export function shuffleWithSeed(list: string[], seed: string): string[] {
  const rand = mulberry32(hashString(`${seed}::${list.join('|')}`));
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = result[i] as string;
    result[i] = result[j] as string;
    result[j] = tmp;
  }
  return result;
}

/**
 * Deal names round-robin into `teamCount` teams after shuffling.
 * Earlier teams receive one extra member when the names do not divide evenly.
 */
export function splitIntoTeams(shuffled: string[], teamCount: number): string[][] {
  const count = Math.max(MIN_TEAM_COUNT, Math.min(MAX_TEAM_COUNT, Math.floor(teamCount)));
  const teams: string[][] = Array.from({ length: count }, () => []);
  shuffled.forEach((name, i) => {
    (teams[i % count] as string[]).push(name);
  });
  return teams.filter((team) => team.length > 0);
}

/**
 * Compute a balanced team count for a target team size:
 * smallest team count whose teams are at most the target size.
 */
export function teamCountForSize(namesCount: number, teamSize: number): number {
  const size = Math.max(MIN_TEAM_SIZE, Math.min(MAX_TEAM_SIZE, Math.floor(teamSize)));
  if (namesCount <= 0) return MIN_TEAM_COUNT;
  return Math.max(1, Math.ceil(namesCount / size));
}

export interface SplitResult {
  /** Computed teams (balanced, shuffled when a seed applies). */
  teams: string[][];
  /** Roster names after parsing and exclusions. */
  active: string[];
  /** Roster names that matched the exclude list. */
  excludedApplied: string[];
  /** Error message when the split cannot run; null when it can. */
  error: string | null;
}

/** Run a full split from the tool state. Pure: no randomness beyond the optional seed. */
export function runSplit(state: ToolState): SplitResult {
  const roster = parseNames(state.names);
  const active = roster.filter(
    (n) => !parseNames(state.exclude).some((e) => e.toLowerCase() === n.toLowerCase())
  );
  const excludedApplied = resolveExclusions(roster, state.exclude);
  if (active.length === 0) {
    return { teams: [], active, excludedApplied, error: 'Add at least one non-excluded name' };
  }
  const teamCount =
    state.mode === 'teams'
      ? Math.max(MIN_TEAM_COUNT, Math.min(MAX_TEAM_COUNT, Math.floor(state.teamCount)))
      : teamCountForSize(active.length, state.teamSize);
  const shuffled = state.seed ? shuffleWithSeed(active, state.seed) : [...active];
  const shuffledForSplit =
    state.mode === 'size' && active.length % teamCount !== 0
      ? shuffled
      : shuffleWithSeed(active, state.seed);
  const teams = splitIntoTeams(shuffledForSplit, teamCount);
  return { teams, active, excludedApplied, error: null };
}

/** Plain text rendering of the teams, one block per team. */
export function formatTeams(teams: string[][]): string {
  return teams
    .map((team, i) => `Team ${i + 1} (${team.length}):\n${team.map((n) => `- ${n}`).join('\n')}`)
    .join('\n\n');
}

/** Compact one-line summary used by the status bar and history. */
export function summaryText(state: ToolState): string {
  if (state.teams.length === 0) {
    return 'No split yet — add names and press Split';
  }
  const sizes = state.teams.map((t) => t.length).join('/');
  return `${state.teams.length} team${state.teams.length === 1 ? '' : 's'} · ${sizes}`;
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.names === 'string' && typeof v.mode === 'string' && Array.isArray(v.teams);
}
