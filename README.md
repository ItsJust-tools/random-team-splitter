# Random Team Splitter

Split any list of names into balanced random teams or groups. A practical team-picking utility for teachers, coaches, game nights and standups.

**Live:** [random-team-splitter.itsjust.tools](https://random-team-splitter.itsjust.tools)

## Features

- Paste names one per line or comma separated; duplicates are removed automatically
- Two modes: split into an exact number of teams, or target a maximum team size
- Exclude / sitting-out list keeps certain people out of the split
- Optional seed for reproducible shuffles — same roster + seed always yields the same teams
- Balanced split: when names do not divide evenly, earlier teams get one extra member
- Copy the team list to the clipboard and save recent splits to history
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action           |
| --- | ---------------- |
| `S` | Split into teams |
| `C` | Copy teams       |
| `R` | Reset inputs     |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-random-team-splitter .
docker run -p 3000:3000 itsjust-random-team-splitter
```

## License

MIT
