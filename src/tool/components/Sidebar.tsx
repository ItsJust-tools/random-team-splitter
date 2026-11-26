'use client';

import React from 'react';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div
      className="p-4 space-y-6 text-sm overflow-y-auto h-full"
      data-testid="team-splitter-sidebar"
    >
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Modes</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Number of teams — split everyone into exactly N teams</li>
          <li>Team size — form as many teams as needed so no team exceeds the target size</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Tips</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Names can be pasted one per line or comma separated; duplicates are ignored.</li>
          <li>Names in the exclude list are left out of the split (e.g. people sitting out).</li>
          <li>
            Set a seed to make the same split reproducible; leave it empty for a fresh shuffle.
          </li>
          <li>When names do not divide evenly, earlier teams get one extra member.</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved splits</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>S</kbd> — Split into teams
          </li>
          <li>
            <kbd>C</kbd> — Copy teams
          </li>
          <li>
            <kbd>R</kbd> — Reset inputs
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current roster and settings;
          open it to restore this split setup.
        </p>
      </div>
    </div>
  );
};
