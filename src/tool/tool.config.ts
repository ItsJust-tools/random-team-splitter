import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'random-team-splitter',
  name: 'Random Team Splitter',
  description:
    'Splits a list of names into balanced random teams or groups, with number-of-teams or target-size modes, an exclude list, reproducible seeds, clipboard copy and shareable state.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#10b981',
    accentHover: '#059669',
    accentSubtle: 'rgba(16, 185, 129, 0.12)',
    brand: 'Random Team Splitter',
    icon: '👥',
  },
  shortcuts: [
    {
      title: 'Team Splitter',
      shortcuts: [
        { keys: 'S', label: 'Split', description: 'shuffle names into teams' },
        { keys: 'C', label: 'Copy teams', description: 'copy the team list to the clipboard' },
        { keys: 'R', label: 'Reset', description: 'clear all inputs and teams' },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
