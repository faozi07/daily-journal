# Daily Journal Workflow

## Generate & post

- Keep `journal-data.json` scoped to the current workweek when generating weekly journal data.
- The user prefers journal generation to use their own preferred-author commits first (`syaeful` / `faozi` / `faozi17` from Bitbucket).
- If a workday has no preferred-author commits, do not leave the entry generic when another day in the same workweek has strong preferred-author commit context. During generation, directly fill that empty date from the most relevant or highest-commit preferred-author day in the same week, and mark it with `usedAuthorFallback: true` plus a `fallbackSourceDate`.
- Do not use other authors' commits as the automatic fallback unless the user explicitly asks for that.
- Generate data first with `--data-only`; post later without `--headless`. Posting should use the existing generated entry in `journal-data.json`.
- Timezone: **UTC+7 (Indonesia)**. Always label weekdays correctly in WIB (e.g. if today is Tuesday 6 Oct, then 22 Sep was also Tuesday).

## Daily journal (Google Form / Sheet)

Use this for **regular daily report** entries — **not** OTAX.

### Hours

- Form shape: **Activity 1** start → **12:00**, **Activity 2** **13:00** → end.
- Default weekday start when user asks for a fixed morning: **08:00** (unless they specify otherwise).
- Weekday **Activity 2 end** minimum: **19:30** (raise later if commits/signals go later).
- Every posted workday should span **at least ~8 hours** (start → end).
- Weekends: only include if there is real activity; use actual start/end (may be short or evening-only).
- Overnight commits before **06:00** belong to the **previous calendar day** for journaling discussion; if splitting days, previous day ends **23:59**, next day starts from **00:00**.

### Activity content

- Prefer commit-specific narratives (preferred-author), not generic “feature delivery” filler.
- Empty weekdays may use same-week preferred-author fallback (`usedAuthorFallback` + `fallbackSourceDate`).
- Manual themes are OK when user sets them (e.g. standby bugfix, research iOS 27 navbar, DTO/swagger audit from AI chat).
- Project form label: **SPARK** unless user says otherwise.

### Recap table format (chat)

```text
| Tanggal | Hari | Jam | Activity 1 | Activity 2 |
|---|---|---|---|---|
| **16 Okt** | Jumat | 08:00 → 19:30 | … | … |
```

### Post checklist

1. `node fill-journal.mjs --date=YYYY-MM-DD --data-only --refresh-data --repo=… --project-label=SPARK`
2. Patch `journal-data.json` times + summaries before post.
3. `node fill-journal.mjs --date=YYYY-MM-DD` (no `--headless`).
4. Confirm `Form submitted` + `Response recorded`. On CAPTCHA, refresh `session.json` (login until form loads), then retry failed dates only.

---

## OTAX (lembur only)

**OTAX ≠ daily journal.** OTAX is **overtime / lembur** reporting only.

### Inclusion rules

- **Weekday:** OT = time **after 8 hours** from work start until work end (only if span > 8h).
- **Weekend / holiday:** any hours with preferred-author activity count as OT (full active span).
- Skip days with no preferred-author activity (and no user-specified OT).
- Signals: preferred-author commits + stash/WIP when relevant.
- Overnight before 06:00: attribute to prior day, or split so **00:00** starts the next date (user preference: prior day max **23:59**).

### Chat / paste format

```text
SPARK #OTAX
—————————————————————————————————————————
Faozi
# <date range> | lembur = weekday setelah 8 jam kerja, weekend semua jam

22 Sep 2026 (Selasa)
15.14 - 18.03
Durasi OT: ~2.8 jam
Reason:
short commit-based reason; keep concrete (ADO/PR ids when useful)
```

### Notes

- Prefer **OT window** (`start+8h → end`) for weekdays, not the full workday, unless user asks for full-day OTAX style again.
- Add `Durasi OT` per day when producing a recap.
- Do not title a regular hours list as `#OTAX`.
