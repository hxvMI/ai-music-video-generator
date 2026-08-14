# Contributing

Thanks for helping improve AI Music Video Generator.

## Development Workflow

1. Create a focused branch such as `feature/progress-styles` or
   `fix/preview-layout`.
2. Keep preview and export behavior aligned. Visual changes belong in the
   shared Remotion scene whenever possible.
3. Keep API credentials server-side or in session-only client state.
4. Add comments where they explain ownership, normalization, deterministic
   rendering, or a non-obvious browser limitation.
5. Run the quality checks before opening a pull request.

```bash
npm install
npm run lint
npm run build
```

## Pull Requests

Include:

- A short description of the user-facing change
- The files or systems affected
- Manual checks performed
- Screenshots for visible interface changes
- Preview/export comparison notes for composition changes

Avoid committing `.env.local`, API keys, uploaded media, generated MP4 files,
`.next/`, or `.render-jobs/`.

## Code Style

- Prefer shared types and pure helpers for configuration logic.
- Normalize persisted data at loading boundaries so older projects still work.
- Keep Remotion inputs serializable and deterministic.
- Use functional state updates when the next value depends on current state.
- Keep comments concise and explain *why* the code exists, not what each line
  already says.
