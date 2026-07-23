# Daily Journal Workflow

- Keep `journal-data.json` scoped to the current workweek when generating weekly journal data.
- The user prefers journal generation to use their own preferred-author commits first (`syaeful` / `faozi` / `faozi17` from Bitbucket).
- If a workday has no preferred-author commits, do not leave the entry generic when another day in the same workweek has strong preferred-author commit context. During generation, directly fill that empty date from the most relevant or highest-commit preferred-author day in the same week, and mark it with `usedAuthorFallback: true` plus a `fallbackSourceDate`.
- Do not use other authors' commits as the automatic fallback unless the user explicitly asks for that.
- Generate data first with `--data-only`; post later without `--headless`. Posting should use the existing generated entry in `journal-data.json`.
