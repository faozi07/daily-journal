/**
 * Generate journal-data.json for 29 Jun – 22 Jul 2026 (workdays).
 * Skips: 6 Jul (cuti), 23 Jul (today).
 * Data-only — does not submit the Google Form.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FILL = path.join(SCRIPT_DIR, "fill-journal.mjs");
const JOURNAL = path.join(SCRIPT_DIR, "journal-data.json");
const SPARK_REPO = "/Users/aleph/Documents/Aleph/react-native-expo-clean-architecture";
const OTA_REPO = "/Users/aleph/Documents/Aleph/brimo/bri-console";

function runFill(date, { repo, projectLabel } = {}) {
  const args = [`--date=${date}`, "--data-only", "--refresh-data"];
  if (repo) args.push(`--repo=${repo}`);
  if (projectLabel) args.push(`--project-label=${projectLabel}`);
  console.log(`\n▸ Generating ${date}${repo ? ` [${path.basename(repo)}]` : ""}…`);
  execSync(`node "${FILL}" ${args.map((a) => `"${a}"`).join(" ")}`, {
    stdio: "inherit",
    cwd: SCRIPT_DIR,
  });
}

function readStore() {
  return JSON.parse(readFileSync(JOURNAL, "utf-8"));
}

function writeStore(store) {
  writeFileSync(JOURNAL, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

function cloneWithOverrides(sourceEntry, date, overrides = {}) {
  return {
    ...sourceEntry,
    ...overrides,
    date,
    generatedAt: new Date().toISOString(),
  };
}

function manualEntry(date, fields) {
  return {
    date,
    generatedAt: new Date().toISOString(),
    rawCommits: fields.rawCommits || [],
    matchedAuthors: fields.matchedAuthors || [],
    fallbackAuthors: [],
    usedAuthorFallback: Boolean(fields.usedAuthorFallback),
    fallbackSourceDate: fields.fallbackSourceDate,
    fallbackReason: fields.fallbackReason,
    latestCommitAt: fields.latestCommitAt || null,
    activity2TimeEnd: fields.activity2TimeEnd || {
      hour: "6",
      minute: "00",
      period: "PM",
    },
    activity2TimeEndSource: fields.activity2TimeEndSource || "manual",
    project: fields.project,
    activitySummary1: fields.activitySummary1,
    description1: fields.description1,
    activitySummary2: fields.activitySummary2,
    description2: fields.description2,
    tomorrowPlan: fields.tomorrowPlan,
    gratitude: fields.gratitude,
  };
}

// Start fresh for this range
writeStore({});

// ── BRI OTA commit days ────────────────────────────────────────────────────────
for (const date of ["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02"]) {
  runFill(date, { repo: OTA_REPO, projectLabel: "BRI OTA Console" });
}

// ── SPARK commit days ──────────────────────────────────────────────────────────
for (const date of [
  "2026-07-09",
  "2026-07-13",
  "2026-07-14",
  "2026-07-15",
  "2026-07-16",
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
]) {
  runFill(date, { repo: SPARK_REPO, projectLabel: "SPARK" });
}

// ── Jul 8: also has BRI OTA commits — generate then merge narrative ─────────────
runFill("2026-07-08", { repo: OTA_REPO, projectLabel: "BRI OTA Console" });

const store = readStore();

// Jul 3 — fallback from Jul 2 (BRI OTA)
store["2026-07-03"] = cloneWithOverrides(store["2026-07-02"], "2026-07-03", {
  usedAuthorFallback: true,
  fallbackSourceDate: "2026-07-02",
  fallbackReason:
    "No preferred-author commits were found for this date, so weekly generation reused the strongest preferred-author commit context from the same workweek.",
  activitySummary1:
    "Continued BRI OTA Console admin UX polish, focusing on breadcrumbs, info boxes, and role permission visibility follow-up.",
  description1:
    "Built on the previous day's admin console improvements to refine navigation clarity and permission visibility across BRI OTA Console finishing work.",
  activitySummary2:
    "Stabilized admin workflows and validated remaining UX edge cases for BRI OTA Console.",
  description2:
    "Supported delivery readiness by checking admin flows, permission presentation, and finishing items ahead of documentation wrap-up.",
  tomorrowPlan:
    "1. Wrap remaining BRI OTA Console finishing items.\n2. Prepare technical documentation updates for handoff.",
  gratitude: "Grateful for steady momentum closing out BRI OTA Console delivery work.",
});

// Jul 7 — SPARK research / install / run (manual)
store["2026-07-07"] = manualEntry("2026-07-07", {
  project: "SPARK",
  activitySummary1:
    "Researched SPARK codebase structure, local installation steps, and app run setup.",
  description1:
    "Spent the day onboarding into the SPARK (react-native-expo-clean-architecture) project: reviewing repository structure, environment requirements, and installation/run documentation to get a working local development setup.",
  activitySummary2:
    "Validated local tooling and documented blockers found during SPARK setup.",
  description2:
    "Worked through dependency install and run attempts, noting configuration gaps and clarifying the path to a stable local SPARK development environment.",
  tomorrowPlan:
    "1. Continue SPARK local setup and verify the app runs end-to-end.\n2. Support BRI OTA Console technical documentation finishing in parallel.",
  gratitude: "Grateful for focused onboarding time to understand a new codebase properly.",
  activity2TimeEnd: { hour: "6", minute: "00", period: "PM" },
});

// Jul 8 — SPARK research + BRI OTA docs (enrich generated OTA entry)
{
  const base = store["2026-07-08"];
  store["2026-07-08"] = {
    ...base,
    project: "SPARK + BRI OTA Console",
    activitySummary1:
      "Continued SPARK codebase research and setup while advancing BRI OTA Console audit-trail finishing.",
    description1:
      "Split the day between SPARK onboarding (code exploration, install/run readiness) and BRI OTA Console work on audit trail breadcrumb fixes and related console finishing items.",
    activitySummary2:
      "Supported BRI OTA Console technical documentation finishing alongside console polish.",
    description2:
      "Helped complete technical documentation for BRI OTA Console while closing small audit-trail UX fixes to keep docs and product behavior aligned.",
    tomorrowPlan:
      "1. Continue SPARK setup and early contribution readiness.\n2. Keep supporting BRI OTA Console technical documentation finishing.",
  };
}

// Jul 9 — SPARK commit day + still helping BRI OTA docs
{
  const base = store["2026-07-09"];
  store["2026-07-09"] = {
    ...base,
    project: "SPARK + BRI OTA Console",
    activitySummary1:
      "Fixed SPARK iOS navigation bar styling for versions under iOS 26 while continuing BRI OTA documentation support.",
    description1:
      "Delivered a SPARK bugfix for navigation bar styling on older iOS versions (KAN-406), and continued assisting BRI OTA Console technical documentation finishing in parallel.",
    activitySummary2:
      "Supported BRI OTA Console technical documentation finishing and cross-checked related console behavior.",
    description2:
      "Helped complete remaining BRI OTA technical documentation items so finishing notes stayed accurate with the latest console behavior.",
    tomorrowPlan:
      "1. Continue SPARK bug fixes and platform UI polish.\n2. Wrap remaining BRI OTA Console documentation finishing tasks.",
  };
}

// Jul 10 — BRI OTA technical documentation finishing (manual)
store["2026-07-10"] = manualEntry("2026-07-10", {
  project: "BRI OTA Console",
  usedAuthorFallback: true,
  fallbackSourceDate: "2026-07-08",
  fallbackReason:
    "No preferred-author commits for this date; filled from BRI OTA documentation finishing context and related OTA work earlier in the week.",
  activitySummary1:
    "Completed BRI OTA Console technical documentation finishing and handoff notes.",
  description1:
    "Focused on finishing technical documentation for BRI OTA Console — aligning docs with final console behavior covering admin UX, auth/SSO-related flows, and remaining delivery notes.",
  activitySummary2:
    "Reviewed documentation completeness and clarified outstanding finishing details.",
  description2:
    "Cross-checked technical docs against recent BRI OTA Console changes to ensure the finishing package was complete and ready for handoff.",
  tomorrowPlan:
    "1. Transition fully into SPARK delivery work.\n2. Carry forward any follow-up notes from BRI OTA documentation finishing.",
  gratitude: "Thankful for the chance to close documentation cleanly and support a smooth handoff.",
  activity2TimeEnd: { hour: "6", minute: "00", period: "PM" },
});

// Jul 17 — research Android cropped + bottom sheet padding
store["2026-07-17"] = manualEntry("2026-07-17", {
  project: "SPARK",
  usedAuthorFallback: true,
  fallbackSourceDate: "2026-07-15",
  fallbackReason:
    "No preferred-author commits for this date; filled from research context plus strongest preferred-author day in the same workweek (2026-07-15).",
  rawCommits: store["2026-07-15"]?.rawCommits?.slice(0, 3) || [],
  matchedAuthors: store["2026-07-15"]?.matchedAuthors || [],
  activitySummary1:
    "Researched SPARK Android cropped layout issues and bottom sheet padding behavior.",
  description1:
    "Investigated Android UI cropping and bottom sheet padding problems in SPARK, reviewing related screens, safe-area/inset handling, and recent navbar/modal fixes to identify root causes and fix directions.",
  activitySummary2:
    "Documented findings and prepared follow-up fix plans for Android inset and bottomsheet padding.",
  description2:
    "Captured reproduction notes and likely fix areas so subsequent implementation could address Android cropped content and bottom sheet padding reliably.",
  tomorrowPlan:
    "1. Implement Android inset / bottomsheet padding fixes based on research findings.\n2. Validate pull-to-refresh and modal cropping regressions on Android.",
  gratitude: "Grateful for dedicated research time that clarified tricky platform UI issues.",
  activity2TimeEnd: { hour: "6", minute: "00", period: "PM" },
  latestCommitAt: store["2026-07-15"]?.latestCommitAt || null,
});

// Tag project on auto-generated SPARK/OTA commit days
for (const [date, entry] of Object.entries(store)) {
  if (!entry.project) {
    if (date <= "2026-07-03" || date === "2026-07-08") {
      entry.project = "BRI OTA Console";
    } else {
      entry.project = "SPARK";
    }
  }
}

// Ensure cuti / today are not present
delete store["2026-07-06"];
delete store["2026-07-23"];

writeStore(store);

const keys = Object.keys(store).sort();
console.log("\n════════════════════════════════════════");
console.log(`✅ Generated ${keys.length} journal entries (data-only)`);
console.log(`   Skipped: 2026-07-06 (cuti), 2026-07-23 (today)`);
console.log(`   YOUR_NAME field will use: Syaeful Hidayat Faozi`);
console.log("   Dates:");
for (const k of keys) {
  const e = store[k];
  const end = e.activity2TimeEnd
    ? `${e.activity2TimeEnd.hour}:${e.activity2TimeEnd.minute} ${e.activity2TimeEnd.period}`
    : "?";
  const flag = e.usedAuthorFallback ? " [fallback]" : "";
  console.log(`   • ${k}  ${e.project || ""}  end=${end}${flag}`);
}
console.log(`\n💾 ${JOURNAL}`);
console.log("════════════════════════════════════════\n");
