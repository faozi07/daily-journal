/**
 * Daily Journal Auto-Fill Script
 *
 * Reads today's git commits from the react-native-expo-clean-architecture project,
 * generates a summary, and submits the Google Form daily journal automatically.
 *
 * Usage:
 *   node fill-journal.mjs
 *   node fill-journal.mjs --date=2026-05-06   (fill for a specific date)
 *   node fill-journal.mjs --date=2026-05-06 --data-only
 *   node fill-journal.mjs --date=2026-05-06 --refresh-data
 */

import { chromium } from "playwright";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync, writeFileSync } from "fs";

// ─── Config ────────────────────────────────────────────────────────────────────

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSddkMKvGNQY-uPV3UTItTGkWFmfzq7RGouW8FAJFYgKYU2OTw/viewform";

const PROJECT_REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../react-native-expo-clean-architecture",
);
const JOURNAL_DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "journal-data.json",
);
// Bitbucket account: faozi17 — match git author name/email from that identity
const PREFERRED_AUTHOR_PATTERNS = ["syaeful", "faozi", "faozi17"];

const YOUR_NAME = "Syaeful";
const PROJECT_NAME = "SPARK";
const ACTIVITY_1_TIME_START = { hour: "9", minute: "00", period: "AM" };
const ACTIVITY_1_TIME_END = { hour: "12", minute: "00", period: "PM" };
const ACTIVITY_2_TIME_START = { hour: "1", minute: "00", period: "PM" };
const ACTIVITY_2_TIME_END = { hour: "6", minute: "00", period: "PM" };
const FEELING = "✅ Good : Steady progress";

// ─── Date helper ───────────────────────────────────────────────────────────────

function parseDateArg() {
  const arg = process.argv.find((a) => a.startsWith("--date="));
  if (arg) {
    const [y, m, d] = arg.replace("--date=", "").split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0); // explicit local-time constructor, no UTC ambiguity
  }
  return new Date();
}

function formatForGoogleDate(date) {
  // Google Forms date widget: month (1-12), day (1-31), year (4 digits)
  return {
    month: String(date.getMonth() + 1),
    day: String(date.getDate()),
    year: String(date.getFullYear()),
  };
}

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateSince(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${formatLocalDate(d)} 00:00:00 +0700`;
}

function formatDateUntil(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return `${formatLocalDate(d)} 23:59:59 +0700`;
}

// ─── Git helper ────────────────────────────────────────────────────────────────

function isPreferredAuthor(authorName, authorEmail) {
  const identity = `${authorName} ${authorEmail}`.toLowerCase();
  return PREFERRED_AUTHOR_PATTERNS.some((pattern) => identity.includes(pattern));
}

function formatAuthors(entries) {
  return Array.from(
    new Set(entries.map((entry) => `${entry.authorName} <${entry.authorEmail}>`)),
  );
}

function getTodayCommitContext(date) {
  const since = formatDateSince(date);
  const until = formatDateUntil(date);
  try {
    const output = execSync(
      `git -C "${PROJECT_REPO}" log --all --no-merges --since="${since}" --until="${until}" --format="%an%x1f%ae%x1f%s"`,
      { encoding: "utf-8" },
    ).trim();
    if (!output) {
      return {
        authorCommits: [],
        matchedAuthors: [],
        fallbackAuthors: [],
        usedAuthorFallback: true,
      };
    }

    const entries = output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [authorName = "", authorEmail = "", subject = ""] = line.split("\x1f");
        return {
          authorName,
          authorEmail,
          subject,
        };
      });

    const authorEntries = entries.filter((entry) =>
      isPreferredAuthor(entry.authorName, entry.authorEmail),
    );

    if (authorEntries.length > 0) {
      return {
        authorCommits: authorEntries.map((entry) => entry.subject).filter(Boolean),
        matchedAuthors: formatAuthors(authorEntries),
        fallbackAuthors: [],
        usedAuthorFallback: false,
      };
    }

    return {
      authorCommits: [],
      matchedAuthors: [],
      fallbackAuthors: [],
      usedAuthorFallback: true,
    };
  } catch {
    console.warn("⚠️  Could not read git log. Using fallback summary.");
    return {
      authorCommits: [],
      matchedAuthors: [],
      fallbackAuthors: [],
      usedAuthorFallback: true,
    };
  }
}

// ─── Summary generator ─────────────────────────────────────────────────────────

function stripCommitPrefix(commit) {
  return commit
    .replace(/^(feat|fix|refactor|chore|test|docs|style)(\([^)]*\))?:\s*/i, "")
    .trim();
}

function joinPhrases(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function detectThemes(commits, themeMap) {
  const matches = [];

  for (const [label, pattern] of themeMap) {
    if (commits.some((commit) => pattern.test(commit.toLowerCase()))) {
      matches.push(label);
    }
  }

  return matches;
}

function cleanCommitTopic(commit) {
  return stripCommitPrefix(commit)
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCommitTopicFallback(commits, type) {
  const topics = commits.map(cleanCommitTopic).filter(Boolean).slice(0, 3);
  if (topics.length === 0) return "";

  const scope = joinPhrases(topics);
  return type === "feature"
    ? `Worked on ${scope} for the SPARK app.`
    : `Supported ${scope} across the SPARK app.`;
}

function splitCommitsByWorkstream(commits) {
  const featureCommits = [];
  const stabilityCommits = [];

  for (const commit of commits) {
    const normalized = commit.toLowerCase();
    const cleaned = stripCommitPrefix(commit);

    if (/^feat(\(|:)|\badd\b|\bbuild\b/.test(normalized)) {
      featureCommits.push(cleaned);
      continue;
    }

    if (/^fix(\(|:)|^refactor(\(|:)|^test(\(|:)|^chore(\(|:)/.test(normalized)) {
      stabilityCommits.push(cleaned);
      continue;
    }

    if (
      /payment|bill|billing|bank|auth|token|signed-out|pin|biometric|route|navigation|deeplink|shell|component|ui|profile|browser/.test(
        normalized,
      )
    ) {
      featureCommits.push(cleaned);
      continue;
    }

    stabilityCommits.push(cleaned);
  }

  return { featureCommits, stabilityCommits };
}

function buildActivitySummary(commits, type) {
  if (commits.length === 0) {
    return type === "feature"
      ? "Feature delivery and user experience improvements for the SPARK app."
      : "Stability improvements, testing, and technical support work for the SPARK app.";
  }

  const themeMap =
    type === "feature"
      ? new Map([
          ["payment and billing flows", /payment|bill|billing|bank/],
          ["shop and product journeys", /shop|product|pack|service|offer|broadband/],
          ["roaming experiences", /roaming|destination|daily roaming/],
          ["verification and account flows", /verification|identity|account|code/],
          ["authentication and account access", /auth|token|signed-out|pin|biometric/],
          ["navigation and journey improvements", /route|navigation|deeplink|shell/],
          ["interface and component updates", /ui|component|profile|browser|stories|tile|screen/],
        ])
      : new Map([
          ["bug fixing and reliability improvements", /fix|bug|error|response|handler|logging|boolean|guard/],
          ["testing and validation work", /\btest\b|mock/],
          ["code cleanup and maintainability", /refactor|extract|normalize|revert/],
          ["environment and release readiness", /eas|version|configuration|dev app/],
        ]);

  const themes = detectThemes(commits, themeMap);

  if (themes.length === 0) {
    const commitFallback = buildCommitTopicFallback(commits, type);
    if (commitFallback) return commitFallback;

    return type === "feature"
      ? "Feature delivery and user experience improvements for the SPARK app."
      : "Stability improvements, testing, and technical support work for the SPARK app.";
  }

  return type === "feature"
    ? `Advanced ${joinPhrases(themes.slice(0, 3))} for the SPARK app.`
    : `Focused on ${joinPhrases(themes.slice(0, 3))} across the SPARK app.`;
}

function buildDescription(commits, type) {
  if (commits.length === 0) {
    return type === "feature"
      ? "Worked on product-facing improvements to support continued feature delivery and a smoother user experience in SPARK."
      : "Handled stability, quality, and maintenance tasks to keep SPARK reliable and ready for ongoing delivery.";
  }

  const themeMap =
    type === "feature"
      ? new Map([
          ["payment and billing journeys", /payment|bill|billing|bank/],
          ["shop and product journeys", /shop|product|pack|service|offer|broadband/],
          ["roaming experiences", /roaming|destination|daily roaming/],
          ["verification and account access flows", /verification|identity|account|code/],
          ["authentication and account access flows", /auth|token|signed-out|pin|biometric/],
          ["navigation behavior across the app", /route|navigation|deeplink|shell/],
          ["interface quality and reusable components", /ui|component|profile|browser|stories|tile|screen/],
        ])
      : new Map([
          ["application stability and issue resolution", /fix|bug|error|response|handler|logging|boolean|guard/],
          ["test coverage and validation", /\btest\b|mock/],
          ["code maintainability and structure", /refactor|extract|normalize|revert/],
          ["release and environment readiness", /eas|version|configuration|dev app/],
        ]);

  const themes = detectThemes(commits, themeMap);
  const scope = joinPhrases(themes.slice(0, 3));

  if (type === "feature") {
    return scope
      ? `Delivered product-facing progress focused on ${scope}, helping improve the overall user experience and feature completeness in SPARK.`
      : buildCommitTopicFallback(commits, type) ||
          "Delivered product-facing improvements that supported smoother user journeys and continued feature progress in SPARK.";
  }

  return scope
    ? `Supported product quality through ${scope}, helping improve reliability, maintainability, and delivery readiness for SPARK.`
    : buildCommitTopicFallback(commits, type) ||
        "Supported product quality through bug fixing, validation, and cleanup work to keep SPARK reliable and ready for continued delivery.";
}

function buildTomorrowPlan(commits) {
  const { featureCommits, stabilityCommits } = splitCommitsByWorkstream(commits);
  const plans = [];

  if (featureCommits.length > 0) {
    plans.push("Continue feature delivery and refine key user journeys in SPARK.");
  }

  if (stabilityCommits.length > 0) {
    plans.push("Address follow-up fixes and validation work to strengthen product stability.");
  }

  if (commits.some((c) => /test|refactor|chore|eas|version|config/i.test(c))) {
    plans.push("Support release readiness through testing, cleanup, and environment checks.");
  }

  if (plans.length === 0) {
    plans.push("Continue product delivery and day-to-day execution for SPARK.");
    plans.push("Review quality, stability, and readiness items for the next work cycle.");
  }

  return plans.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join("\n");
}

function buildGratitude(date) {
  const messages = [
    "Grateful for a focused and productive workday with clear progress.",
    "Thankful for the team collaboration and smooth development flow today.",
    "Grateful for the energy and clarity that helped me push through challenges.",
    "Thankful for good tooling, a stable codebase, and meaningful work.",
    "Grateful for the opportunity to learn something new and ship real features.",
    "Thankful for consistent progress and a codebase that keeps getting better.",
    "Grateful for problem-solving moments that led to clean solutions today.",
    "Thankful for a productive session and the ability to iterate quickly.",
    "Grateful for the discipline to stay focused and deliver quality work.",
    "Thankful for a great working environment and meaningful daily contribution.",
    "Grateful for steady momentum and the satisfaction of completing key tasks.",
    "Thankful for the clarity of purpose and the tools that support great work.",
    "Grateful for every bug fixed and every feature shipped with care.",
    "Thankful for resilience when things got tricky and for pushing through.",
    "Grateful for a team culture that values clean code and thoughtful design.",
  ];
  const idx = date.getDate() % messages.length;
  return messages[idx];
}

function buildJournalEntry(date, commitContext) {
  const {
    authorCommits,
    matchedAuthors,
    fallbackAuthors = [],
    usedAuthorFallback = authorCommits.length === 0,
  } = commitContext;
  const { featureCommits, stabilityCommits } = splitCommitsByWorkstream(authorCommits);
  const activitySummary1 = buildActivitySummary(featureCommits, "feature");
  const description1 = buildDescription(featureCommits, "feature");
  const activitySummary2 = buildActivitySummary(stabilityCommits, "stability");
  const description2 = buildDescription(stabilityCommits, "stability");
  const tomorrowPlan = buildTomorrowPlan(authorCommits);
  const gratitude = buildGratitude(date);

  return {
    date: formatLocalDate(date),
    generatedAt: new Date().toISOString(),
    rawCommits: authorCommits,
    matchedAuthors,
    fallbackAuthors,
    usedAuthorFallback,
    activitySummary1,
    description1,
    activitySummary2,
    description2,
    tomorrowPlan,
    gratitude,
  };
}

function readJournalDataStore() {
  if (!existsSync(JOURNAL_DATA_FILE)) {
    return {};
  }

  try {
    const raw = readFileSync(JOURNAL_DATA_FILE, "utf-8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.warn(
      `⚠️  Could not parse ${JOURNAL_DATA_FILE}. Recreating it. Reason: ${error.message}`,
    );
    return {};
  }
}

function writeJournalDataStore(store) {
  writeFileSync(
    JOURNAL_DATA_FILE,
    `${JSON.stringify(store, null, 2)}\n`,
    "utf-8",
  );
}

function upsertJournalEntry(date, commitContext) {
  const key = formatLocalDate(date);
  const store = readJournalDataStore();
  const entry = buildJournalEntry(date, commitContext);

  store[key] = entry;
  writeJournalDataStore(store);

  return { key, entry };
}

// ─── Playwright helpers ────────────────────────────────────────────────────────

async function fillTimeWidget(
  page,
  labelText,
  { hour, minute, period },
  nth = 0,
) {
  // Prefer label-scoped query, but fall back to global nth inputs when form wrappers change.
  let section = page
    .locator('[jscontroller="sWGJ4b"]', { hasText: labelText })
    .nth(nth);
  let hourInput = section.locator('input[aria-label="Hour"]').first();
  let minuteInput = section.locator('input[aria-label="Minute"]').first();

  if ((await hourInput.count()) === 0 || (await minuteInput.count()) === 0) {
    hourInput = page.locator('input[aria-label="Hour"]').nth(nth);
    minuteInput = page.locator('input[aria-label="Minute"]').nth(nth);
    section = hourInput
      .locator('xpath=ancestor::div[@jscontroller="sWGJ4b"]')
      .first();
  }

  await hourInput.click();
  await hourInput.fill(hour);
  await minuteInput.click();
  await minuteInput.fill(minute);

  // AM/PM: click listbox in the nearest section, then pick the option globally as fallback.
  const ampmListbox = section.locator('[role="listbox"]').first();
  await ampmListbox.click();
  await page.waitForTimeout(300);
  let periodOption = section
    .locator(`[role="option"][data-value="${period}"]`)
    .first();
  if ((await periodOption.count()) === 0) {
    periodOption = page
      .locator(`[role="option"][data-value="${period}"]`)
      .first();
  }
  await periodOption.click();

  console.log(`  ✓ ${labelText}: ${hour}:${minute.padStart(2, "0")} ${period}`);
}

async function fillDateWidget(page, labelText, { month, day, year }) {
  const section = page
    .locator('div[role="group"]', { hasText: labelText })
    .first();

  const monthInput = section.locator('input[aria-label="Month"]').first();
  const dayInput = section.locator('input[aria-label="Day"]').first();
  const yearInput = section.locator('input[aria-label="Year"]').first();

  await monthInput.click();
  await monthInput.fill(month);
  await dayInput.click();
  await dayInput.fill(day);
  await yearInput.click();
  await yearInput.fill(year);

  console.log(`  ✓ ${labelText}: ${month}/${day}/${year}`);
}

async function selectDropdown(page, labelText, optionText, nth = 0) {
  // Find the outer section container by heading text
  const section = page
    .locator('[jscontroller="sWGJ4b"]', { hasText: labelText })
    .nth(nth);
  // Click the listbox trigger to open it
  const trigger = section.locator('[role="listbox"]').first();
  await trigger.click();
  await page.waitForTimeout(400);
  // Click the matching option
  const option = section
    .locator('[role="option"]', { hasText: optionText })
    .first();
  await option.click();
  console.log(`  ✓ ${labelText}: ${optionText}`);
}

async function fillTextInput(page, labelText, value) {
  // Find outer section by heading text, then find input/textarea within it
  const section = page
    .locator('[jscontroller="sWGJ4b"]', { hasText: labelText })
    .first();
  const input = section.locator("input, textarea").first();
  await input.click();
  await input.fill(value);
  console.log(
    `  ✓ ${labelText}: ${value.slice(0, 60)}${value.length > 60 ? "…" : ""}`,
  );
}

async function fillNativeDateInput(page, isoDate) {
  // isoDate = 'YYYY-MM-DD'
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill(isoDate);
  console.log(`  ✓ Date: ${isoDate}`);
}

async function fillNativeNameInput(page, value) {
  // Find the short text input that is NOT a date input
  const input = page.locator('input[type="text"], input:not([type])').first();
  await input.click();
  await input.fill(value);
  console.log(`  ✓ Your Name: ${value}`);
}

async function selectNativeDropdown(page, optionText) {
  // Try native <select> first, fall back to Google Forms custom dropdown
  try {
    const select = page.locator("select").first();
    await select.waitFor({ timeout: 5000 });
    await select.selectOption({ label: optionText });
    console.log(`  ✓ Feeling: ${optionText}`);
  } catch {
    // Google Forms custom dropdown (div-based listbox)
    const trigger = page
      .locator('[role="listbox"], div[jsname="wQNmvb"]')
      .first();
    await trigger.click();
    await page.waitForTimeout(500);
    const option = page
      .locator('[role="option"]', { hasText: optionText })
      .first();
    await option.click();
    console.log(`  ✓ Feeling (custom): ${optionText}`);
  }
}

async function clickNext(page) {
  // Try role button first, then plain button element
  let nextBtn = page.locator('div[role="button"]', { hasText: "Next" }).first();
  try {
    await nextBtn.waitFor({ timeout: 3000 });
  } catch {
    nextBtn = page.locator("button", { hasText: "Next" }).first();
  }
  await nextBtn.click();
  await page.waitForTimeout(1500);
  console.log("  → Clicked Next");
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const date = parseDateArg();
  const dataOnly = process.argv.includes("--data-only");
  const refreshData = process.argv.includes("--refresh-data");

  console.log(`\n📅 Daily Journal — ${date.toDateString()}`);
  console.log("─".repeat(50));

  // Gather commit data
  const commitContext = getTodayCommitContext(date);
  const { authorCommits, matchedAuthors } = commitContext;
  console.log(`\n📦 Found ${authorCommits.length} preferred author commit(s) today:`);
  authorCommits.slice(0, 5).forEach((c) => console.log(`   • ${c}`));
  if (authorCommits.length > 5) {
    console.log(`   … and ${authorCommits.length - 5} more`);
  }
  if (matchedAuthors.length > 0) {
    console.log(`   Authors matched: ${matchedAuthors.join(", ")}`);
  } else {
    console.log(
      "   No preferred author commits found. Using generated fallback wording.",
    );
  }

  let journalDateKey = formatLocalDate(date);
  let journalEntry = readJournalDataStore()[journalDateKey];
  const shouldUseExistingEntry = !dataOnly && !refreshData && journalEntry;

  if (shouldUseExistingEntry) {
    console.log(
      `\n💾 Using existing journal data: ${JOURNAL_DATA_FILE} (${journalDateKey})`,
    );
  } else {
    const result = upsertJournalEntry(date, commitContext);
    journalDateKey = result.key;
    journalEntry = result.entry;
    console.log(
      `\n💾 Journal data saved: ${JOURNAL_DATA_FILE} (${journalDateKey})`,
    );
  }

  console.log("\n📝 Activity Summary:");
  console.log(
    "  ",
    journalEntry.activitySummary1.slice(0, 100) +
      (journalEntry.activitySummary1.length > 100 ? "…" : ""),
  );

  console.log("\n🗓️  Tomorrow Plan:");
  console.log(
    journalEntry.tomorrowPlan
      .split("\n")
      .map((l) => "  " + l)
      .join("\n"),
  );
  console.log("");

  if (dataOnly) {
    console.log("Data-only mode: skipped Google Form submission.\n");
    return;
  }

  const SESSION_FILE = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "session.json",
  );

  if (!existsSync(SESSION_FILE)) {
    console.error("❌ No session found. Run: node login.mjs first.");
    process.exit(1);
  }

  const headless = process.argv.includes("--headless");
  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 150,
  });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();

  try {
    // ── Page 1: Basic Info ────────────────────────────────────────────────────
    console.log("\n[Page 1] Basic Info");
    await page.goto(FORM_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Email checkbox — Google Forms uses role="checkbox", not input[type="checkbox"]
    try {
      const emailCheckbox = page.locator('[role="checkbox"]').first();
      await emailCheckbox.waitFor({ timeout: 5000 });
      const isChecked = await emailCheckbox.getAttribute("aria-checked");
      if (isChecked !== "true") {
        await emailCheckbox.click();
        console.log("  ✓ Email checkbox: checked");
      } else {
        console.log("  ✓ Email checkbox: already checked");
      }
    } catch {
      console.log("  ⚠ Email checkbox: not found, skipping");
    }

    // Your Name — plain text input
    await fillNativeNameInput(page, YOUR_NAME);

    // Date Daily Journal — native date input (YYYY-MM-DD)
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    await fillNativeDateInput(page, isoDate);

    // Feeling — native <select>
    await selectNativeDropdown(page, FEELING);

    await clickNext(page);

    // ── Page 2: Activity ─────────────────────────────────────────────────────
    console.log("\n[Page 2] Activity Details");
    await page.waitForTimeout(1000);

    // Time Start
    await fillTimeWidget(page, "Time Start", ACTIVITY_1_TIME_START);

    // Time End
    await fillTimeWidget(page, "Time End", ACTIVITY_1_TIME_END);

    // Project dropdown
    await selectDropdown(page, "Project", PROJECT_NAME);

    // Activity Summary 1
    await fillTextInput(
      page,
      "Activity Summary 1",
      journalEntry.activitySummary1,
    );

    // Description 1
    await fillTextInput(page, "Description 1", journalEntry.description1);

    // Activity 2 fields (Time Start, Time End, Summary, Description) — same as activity 1
    try {
      const summary2 = page
        .locator('[jscontroller="sWGJ4b"]', { hasText: "Activity Summary 2" })
        .first();
      await summary2.waitFor({ timeout: 3000 });
      await fillTimeWidget(page, "Time Start", ACTIVITY_2_TIME_START, 1);
      await fillTimeWidget(page, "Time End", ACTIVITY_2_TIME_END, 1);
      await selectDropdown(page, "Project", PROJECT_NAME, 1);
      await fillTextInput(
        page,
        "Activity Summary 2",
        journalEntry.activitySummary2,
      );
      await fillTextInput(page, "Description 2", journalEntry.description2);
    } catch {
      console.log("  ✓ Activity 2 fields: not found, skipping");
    }

    await clickNext(page);

    // ── Page 3: Overtime ─────────────────────────────────────────────────────
    console.log("\n[Page 3] Overtime — skipping");
    await page.waitForTimeout(2000);
    await clickNext(page);

    // ── Page 4: Plan Ahead ───────────────────────────────────────────────────
    console.log("\n[Page 4] Plan Ahead");
    // Wait for at least one textarea to be visible on the page
    await page.waitForSelector("textarea", { timeout: 15000 });
    await page.waitForTimeout(500);

    // Use positional textarea selectors — Page 4 has: planned tasks, risk/blocker (optional), gratitude
    const textareas = page.locator("textarea");
    const count = await textareas.count();

    // First textarea: planned tasks for tomorrow
    const tasksTextarea = textareas.nth(0);
    await tasksTextarea.click();
    await tasksTextarea.fill(journalEntry.tomorrowPlan);
    console.log(
      `  ✓ Planned tasks: ${journalEntry.tomorrowPlan.slice(0, 60)}…`,
    );

    // Risk / Blocker — skip (leave empty, it's optional)
    console.log("  ✓ Risk/Blocker: (skipped — no blockers)");

    // Last textarea: Gratitude
    const gratitudeTextarea = textareas.nth(count - 1);
    await gratitudeTextarea.click();
    await gratitudeTextarea.fill(journalEntry.gratitude);
    console.log(`  ✓ Gratitude: ${journalEntry.gratitude}`);

    // Send me a copy toggle (optional — skip if not present)
    try {
      const copyToggle = page.locator('div[role="switch"]').first();
      await copyToggle.waitFor({ timeout: 3000 });
      const isOn = await copyToggle.getAttribute("aria-checked");
      if (isOn !== "true") {
        await copyToggle.click();
        console.log("  ✓ Send copy: enabled");
      } else {
        console.log("  ✓ Send copy: already enabled");
      }
    } catch {
      console.log("  ✓ Send copy toggle: not found, skipping");
    }

    await page.waitForTimeout(800);

    // Submit
    const submitBtn = page
      .locator('div[role="button"]', { hasText: "Submit" })
      .first();
    await submitBtn.click();
    console.log("\n✅ Form submitted!");

    // Wait for confirmation page
    await page.waitForTimeout(3000);
    const pageText = await page.textContent("body");
    if (
      pageText?.includes("Your response has been recorded") ||
      pageText?.includes("response")
    ) {
      console.log("✅ Confirmed: Response recorded by Google Forms.\n");
    }
  } catch (err) {
    console.error("\n❌ Error during form fill:", err.message);
    if (!headless) {
      console.log(
        "   Browser will stay open so you can inspect and fill manually.",
      );
      await page.waitForTimeout(60000).catch(() => {});
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main();
