---
name: daily-journal-otax
description: >-
  Generate SPARK daily journal drafts/posts and OTAX (lembur) recaps for
  syaeful/faozi. Use when the user asks for daily journal, Google Form/Sheet
  journal, rekap activity, OTAX, lembur, jam kerja, or posting fill-journal.
---

# Daily Journal & OTAX

Canonical rules live in repo root `AGENTS.md`. Follow that file; this skill is the trigger + checklist.

## When to use

- Daily journal recap / draft / generate / post (Google Form)
- OTAX / lembur list
- Jam kerja harian (regular hours — **not** labeled OTAX)

## Quick rules

1. Timezone **UTC+7**; label Hari correctly.
2. Preferred authors: `syaeful` / `faozi` / `faozi17`.
3. Journal: generate `--data-only` first; post without `--headless` from `journal-data.json`.
4. Journal hours default: start **08:00**, weekday end ≥ **19:30**, Act1→12:00 / Act2 13:00→end, min ~8h span.
5. Empty weekday → same-week preferred-author fallback + `usedAuthorFallback` / `fallbackSourceDate`.
6. **OTAX = lembur only**: weekday OT after 8h; weekend any hours. Never call a normal daily hours list `#OTAX`.

## OTAX paste template

```text
SPARK #OTAX
—————————————————————————————————————————
Faozi
# <range>

<DD Mon YYYY> (<Hari>)
HH.MM - HH.MM
Durasi OT: ~X.X jam
Reason:
…
```

## Journal recap template

```text
| Tanggal | Hari | Jam | Activity 1 | Activity 2 |
```

## Post flow

```bash
node fill-journal.mjs --date=YYYY-MM-DD --data-only --refresh-data \
  --repo="/Users/aleph/Documents/Aleph/react-native-expo-clean-architecture" \
  --project-label=SPARK
# edit journal-data.json times + narratives
node fill-journal.mjs --date=YYYY-MM-DD
```

On CAPTCHA: refresh `session.json` by opening the form until logged in, then retry failed dates only.
