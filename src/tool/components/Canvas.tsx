'use client';

import React from 'react';
import { formatTeams, summaryText } from '../tool-definition';
import type { ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
  onSplit?: () => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory, onSplit }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const summary = summaryText(state);

  const modeSwitch = (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Split mode"
      data-testid="mode-tabs"
    >
      {(
        [
          { value: 'teams', label: 'Number of teams' },
          { value: 'size', label: 'Team size' },
        ] as const
      ).map((mode) => (
        <button
          key={mode.value}
          type="button"
          role="tab"
          aria-selected={state.mode === mode.value}
          data-testid={`mode-tab-${mode.value}`}
          onClick={() => update({ mode: mode.value })}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            state.mode === mode.value
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="team-splitter-canvas">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Names (one per line or comma separated)
          <textarea
            value={state.names}
            onChange={(e) => update({ names: e.target.value })}
            rows={8}
            data-testid="input-names"
            placeholder={'Alice\nBob\nCarol\nDave'}
            className={`${inputClass} font-mono`}
          />
        </label>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Exclude / sitting out (optional)
          <textarea
            value={state.exclude}
            onChange={(e) => update({ exclude: e.target.value })}
            rows={8}
            data-testid="input-exclude"
            placeholder="Names to leave out of the split"
            className={`${inputClass} font-mono`}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">{modeSwitch}</div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          {state.mode === 'teams' ? 'Teams' : 'Players per team'}
          <input
            type="number"
            min={state.mode === 'teams' ? 2 : 2}
            max={state.mode === 'teams' ? 20 : 50}
            value={state.mode === 'teams' ? state.teamCount : state.teamSize}
            onChange={(e) =>
              update(
                state.mode === 'teams'
                  ? { teamCount: Math.max(2, Math.floor(Number(e.target.value) || 2)) }
                  : { teamSize: Math.max(2, Math.floor(Number(e.target.value) || 2)) }
              )
            }
            data-testid={state.mode === 'teams' ? 'input-team-count' : 'input-team-size'}
            className={inputClass}
          />
        </label>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Seed (optional, reproducible)
          <input
            type="text"
            value={state.seed}
            onChange={(e) => update({ seed: e.target.value })}
            data-testid="input-seed"
            placeholder="e.g. tuesday"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="btn-split"
          onClick={() => onSplit?.()}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          Split into teams
        </button>
        {state.teams.length > 0 ? (
          <button
            type="button"
            data-testid="btn-copy-teams"
            onClick={() => void navigator.clipboard.writeText(formatTeams(state.teams))}
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Copy teams
          </button>
        ) : null}
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        data-testid="result-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Result
        </span>
        <span className="block font-mono text-2xl font-bold" data-testid="result-main">
          {state.teams.length > 0
            ? `${state.teams.length} team${state.teams.length === 1 ? '' : 's'}`
            : '—'}
        </span>
        <span
          className="mt-1 block text-xs text-gray-600 dark:text-gray-300"
          data-testid="result-summary"
        >
          {summary}
        </span>
        {state.teams.length > 0 && onSaveHistory ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(summary)}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </div>

      {state.teams.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="teams-grid">
          {state.teams.map((team, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              data-testid={`team-${i + 1}`}
            >
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Team {i + 1} · {team.length}
              </h3>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {team.map((name, j) => (
                  <li
                    key={`${name}-${j}`}
                    className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-800"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p
          className="text-center text-xs text-gray-500 dark:text-gray-400"
          data-testid="teams-empty"
        >
          No teams yet — paste names above and press Split.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved splits yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-800 dark:text-gray-300"
              >
                {entry.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All splitting runs locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
