'use client';

import React from 'react';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
  onSplit?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy, onSplit }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Team splitter controls">
        <button
          type="button"
          onClick={onSplit}
          data-testid="btn-toolbar-split"
          className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
        >
          Split
        </button>
        {onCopy && state.teams.length > 0 ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Copy teams
          </button>
        ) : null}
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="btn-clear-history"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear history
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
