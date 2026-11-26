import { describe, it, expect } from 'vitest';
import {
  parseNames,
  resolveExclusions,
  hashString,
  mulberry32,
  shuffleWithSeed,
  splitIntoTeams,
  teamCountForSize,
  runSplit,
  formatTeams,
  summaryText,
  isState,
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_TEAM_COUNT,
  MIN_TEAM_COUNT,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  withHistory,
  withSplit,
  roundTrips,
  randomTeamSplitterTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseNames', () => {
  it('parses newline and comma separated names, trimming whitespace', () => {
    expect(parseNames('Alice\nBob\nCarol')).toEqual(['Alice', 'Bob', 'Carol']);
    expect(parseNames('Alice, Bob ,Carol')).toEqual(['Alice', 'Bob', 'Carol']);
    expect(parseNames('Alice\n\nBob,  ,\nCarol')).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('drops duplicates case-insensitively, keeping first occurrence', () => {
    expect(parseNames('alice\nAlice\nALICE\nbob')).toEqual(['alice', 'bob']);
  });

  it('returns an empty array for empty or blank input', () => {
    expect(parseNames('')).toEqual([]);
    expect(parseNames('   \n  ,  ')).toEqual([]);
  });
});

describe('resolveExclusions', () => {
  it('returns roster names that match the exclude list', () => {
    const roster = ['Alice', 'Bob', 'Carol'];
    expect(resolveExclusions(roster, 'bob, Dave')).toEqual(['Bob']);
  });

  it('returns empty when nothing matches', () => {
    expect(resolveExclusions(['Alice'], 'Zed')).toEqual([]);
  });
});

describe('seeded shuffle', () => {
  it('hashString is deterministic and varies by input', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });

  it('mulberry32 produces a deterministic stream in [0,1)', () => {
    const rand1 = mulberry32(42);
    const rand2 = mulberry32(42);
    const values = Array.from({ length: 10 }, () => rand1());
    const values2 = Array.from({ length: 10 }, () => rand2());
    expect(values).toEqual(values2);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('same seed + same roster produce identical order', () => {
    const list = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(shuffleWithSeed(list, 'seed1')).toEqual(shuffleWithSeed(list, 'seed1'));
  });

  it('same seed with different roster order produces a different permutation', () => {
    expect(shuffleWithSeed(['a', 'b', 'c'], 'seed')).not.toEqual(
      shuffleWithSeed(['c', 'b', 'a'], 'seed')
    );
  });

  it('different seeds can produce different orders for the same roster', () => {
    const list = Array.from({ length: 12 }, (_, i) => `n${i}`);
    const orders = ['s1', 's2', 's3', 's4', 's5'].map((seed) =>
      shuffleWithSeed(list, seed).join(',')
    );
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it('is a permutation: preserves all elements', () => {
    const list = ['x', 'y', 'z'];
    expect([...shuffleWithSeed(list, 'p')].sort()).toEqual(list);
  });
});

describe('splitIntoTeams', () => {
  it('distributes evenly when names divide evenly', () => {
    const teams = splitIntoTeams(['a', 'b', 'c', 'd'], 2);
    expect(teams.map((t) => t.length)).toEqual([2, 2]);
  });

  it('gives earlier teams one extra member when uneven', () => {
    const teams = splitIntoTeams(['a', 'b', 'c', 'd', 'e'], 2);
    expect(teams.map((t) => t.length)).toEqual([3, 2]);
  });

  it('every name appears exactly once across teams', () => {
    const names = Array.from({ length: 13 }, (_, i) => `n${i}`);
    const teams = splitIntoTeams(names, 4);
    const flat = teams.flat().sort();
    expect(flat).toEqual([...names].sort());
  });

  it('drops empty teams when teamCount exceeds the number of names', () => {
    const teams = splitIntoTeams(['a'], 5);
    expect(teams).toHaveLength(1);
  });

  it('clamps team count to supported bounds', () => {
    const teams = splitIntoTeams(['a', 'b'], 999);
    expect(teams).toHaveLength(2);
    expect(teams.filter((t) => t.length > 0)).toHaveLength(2);
    expect(splitIntoTeams(['a', 'b'], 1)).toHaveLength(MIN_TEAM_COUNT);
  });
});

describe('teamCountForSize', () => {
  it('returns the smallest count whose teams fit the target size', () => {
    expect(teamCountForSize(10, 4)).toBe(3);
    expect(teamCountForSize(8, 4)).toBe(2);
    expect(teamCountForSize(9, 4)).toBe(3);
  });

  it('returns at least 1 team and clamps size bounds', () => {
    expect(teamCountForSize(1, 4)).toBe(1);
    expect(teamCountForSize(0, 4)).toBe(MIN_TEAM_COUNT);
    expect(teamCountForSize(200, 1000)).toBe(4);
  });
});

describe('runSplit', () => {
  it('reports an error for an empty roster', () => {
    const result = runSplit(state({ names: '', exclude: '' }));
    expect(result.error).toMatch(/at least one/i);
    expect(result.teams).toEqual([]);
  });

  it('reports an error when every name is excluded', () => {
    const result = runSplit(state({ names: 'Alice\nBob', exclude: 'alice, bob' }));
    expect(result.error).toMatch(/at least one/i);
    expect(result.active).toEqual([]);
    expect(result.excludedApplied).toEqual(['Alice', 'Bob']);
  });

  it('applies exclusions before splitting', () => {
    const result = runSplit(state({ names: 'Alice\nBob\nCarol\nDave', exclude: 'Carol' }));
    expect(result.active).toEqual(['Alice', 'Bob', 'Dave']);
    expect(result.excludedApplied).toEqual(['Carol']);
    expect(result.teams.flat().sort()).toEqual(['Alice', 'Bob', 'Dave']);
  });

  it('unseeded splits are still a permutation of the roster', () => {
    const names = Array.from({ length: 7 }, (_, i) => `n${i}`);
    const result = runSplit(state({ names: names.join('\n'), teamCount: 3 }));
    expect(result.teams.flat().sort()).toEqual(names);
  });

  it('size mode creates the correct number of teams that respect the max size', () => {
    const names = Array.from({ length: 10 }, (_, i) => `n${i}`);
    const result = runSplit(state({ names: names.join('\n'), mode: 'size', teamSize: 4 }));
    expect(result.teams).toHaveLength(3);
    for (const team of result.teams) expect(team.length).toBeLessThanOrEqual(4);
  });

  it('same seed and roster produce identical teams', () => {
    const s = state({ names: 'a\nb\nc\nd\ne\nf', teamCount: 2, seed: 'fixed' });
    expect(runSplit(s).teams).toEqual(runSplit({ ...s, teams: [] }).teams);
  });

  it('seeded split matches a direct manually-verified distribution', () => {
    const s = state({ names: 'a\nb\nc\nd', teamCount: 2, seed: 'known' });
    const result = runSplit(s);
    const direct = splitIntoTeams(shuffleWithSeed(['a', 'b', 'c', 'd'], 'known'), 2);
    expect(result.teams).toEqual(direct);
  });
});

describe('formatTeams and summaryText', () => {
  it('formats teams with headers and members', () => {
    const text = formatTeams([['Alice', 'Bob'], ['Carol']]);
    expect(text).toContain('Team 1 (2):');
    expect(text).toContain('- Alice');
    expect(text).toContain('Team 2 (1):');
  });

  it('summaryText describes the current split', () => {
    expect(summaryText(state({ teams: [] }))).toMatch(/No split yet/i);
    expect(summaryText(state({ teams: [['a', 'b'], ['c']] }))).toBe('2 teams · 2/1');
  });

  it('isState accepts valid shapes and rejects others', () => {
    expect(isState({ names: '', mode: 'teams', teams: [] })).toBe(true);
    expect(isState(null)).toBe(false);
    expect(isState({ names: 5, mode: 'teams', teams: [] })).toBe(false);
  });
});

describe('serialize / deserialize', () => {
  it('serialize includes all fields', () => {
    const s = state({ names: 'a\nb', seed: 'z' });
    const json = serializeState(s);
    expect(json).toContain('"names":"a\\nb"');
    expect(json).toContain('"seed":"z"');
  });

  it('deserialize restores a serialized state exactly', () => {
    const s = state({ names: 'a\nb', exclude: 'c', mode: 'size', teamSize: 3, seed: 's' });
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored.success).toBe(true);
    if (restored.success) expect(restored.data).toEqual(s);
  });

  it('deserialize repairs invalid payloads with defaults', () => {
    const repaired = deserializeState({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.mode).toBe(DEFAULT_STATE.mode);
      expect(repaired.data.teams).toEqual([]);
      expect(repaired.data.history).toEqual([]);
    }
  });

  it('deserialize falls back for bad mode and clamps numeric fields', () => {
    const repaired = deserializeState({
      mode: 42,
      teamCount: 9999,
      teamSize: -5,
      names: 'a',
      teams: [['a', 5], 'nope', ['b']],
      history: [{ text: 'x', createdAt: '2026-01-01T00:00:00.000Z' }, 'bad'],
    });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.mode).toBe('teams');
      expect(repaired.data.teamCount).toBe(MAX_TEAM_COUNT);
      expect(repaired.data.teamSize).toBe(2); // clamped to MIN_TEAM_SIZE
      expect(repaired.data.teams).toEqual([['a'], ['b']]);
      expect(repaired.data.history).toHaveLength(1);
    }
  });

  it('deserialize rejects non-object payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('string').success).toBe(false);
    expect(deserializeState([1]).success).toBe(false);
  });

  it('caps history at MAX_HISTORY on deserialize and withHistory', () => {
    const entries = Array.from({ length: MAX_HISTORY + 10 }, (_, i) => ({
      text: `t${i}`,
      createdAt: new Date(i).toISOString(),
    }));
    const repaired = deserializeState({ history: entries });
    expect(repaired.success && repaired.data.history).toHaveLength(MAX_HISTORY);
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i++) s = withHistory(s, `t${i}`);
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`t${MAX_HISTORY + 4}`);
  });

  it('roundTrips validates a full round trip', () => {
    expect(roundTrips(state({ names: 'a\nb', seed: 'q' }))).toBe(true);
  });
});

describe('withSplit and tool definition', () => {
  it('withSplit stores recomputed teams', () => {
    const s = withSplit(state({ names: 'a\nb\nc\nd', teamCount: 2 }));
    expect(s.teams).toHaveLength(2);
    expect(s.teams.flat().sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('withSplit clears teams when the roster becomes empty', () => {
    const s = withSplit(state({ names: 'a\nb', teams: [['a'], ['b']] }));
    const cleared = withSplit({ ...s, names: '', exclude: '' });
    expect(cleared.teams).toEqual([]);
  });

  it('tool exposes config identity and exporters', async () => {
    expect(randomTeamSplitterTool.id).toBe('random-team-splitter');
    expect(randomTeamSplitterTool.config.exportFormats).toEqual(['png', 'jpeg', 'webp', 'pdf']);
    const exporters = randomTeamSplitterTool.exporters ?? [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await first.loader();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });
});
