import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_TEAM_COUNT,
  MAX_TEAM_SIZE,
  MIN_TEAM_COUNT,
  MIN_TEAM_SIZE,
  formatTeams,
  parseNames,
  resolveExclusions,
  runSplit,
  summaryText,
  type HistoryEntry,
  type SplitMode,
  type ToolState,
} from './types';

const VALID_MODES: SplitMode[] = ['teams', 'size'];

function clampCount(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : NaN;
  if (Number.isNaN(n)) return DEFAULT_STATE.teamCount;
  return Math.max(MIN_TEAM_COUNT, Math.min(MAX_TEAM_COUNT, n));
}

function clampSize(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : NaN;
  if (Number.isNaN(n)) return DEFAULT_STATE.teamSize;
  return Math.max(MIN_TEAM_SIZE, Math.min(MAX_TEAM_SIZE, n));
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    names: state.names,
    exclude: state.exclude,
    mode: state.mode,
    teamCount: state.teamCount,
    teamSize: state.teamSize,
    seed: state.seed,
    teams: state.teams,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validTeams(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((team): team is string[] => Array.isArray(team))
    .map((team) => team.filter((n): n is string => typeof n === 'string'));
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected team splitter state object',
    };
  }
  const v = data as Record<string, unknown>;
  const mode: SplitMode = VALID_MODES.includes(v.mode as SplitMode)
    ? (v.mode as SplitMode)
    : DEFAULT_STATE.mode;
  const state: ToolState = {
    names: stringOr(v.names, DEFAULT_STATE.names),
    exclude: stringOr(v.exclude, DEFAULT_STATE.exclude),
    mode,
    teamCount: clampCount(v.teamCount),
    teamSize: clampSize(v.teamSize),
    seed: stringOr(v.seed, DEFAULT_STATE.seed),
    teams: validTeams(v.teams),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Recompute teams for the current state and store them. */
export function withSplit(state: ToolState): ToolState {
  const result = runSplit(state);
  return { ...state, teams: result.teams };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const randomTeamSplitterTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { formatTeams, parseNames, resolveExclusions, runSplit, summaryText };
