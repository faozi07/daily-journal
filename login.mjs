/**
 * One-time Google login — saves session to session.json
 *
 * Run once:
 *   node login.mjs
 *
 * Then use fill-journal.mjs normally. Session stays valid for weeks.
 * If session expires, just run this again.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const SESSION_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'session.json',
);

const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSddkMKvGNQY-uPV3UTItTGkWFmfzq7RGouW8FAJFYgKYU2OTw/viewform';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

console.log('\n🔐 Opening Google login...');
console.log('   Login with your Google account in the browser window.');
console.log('   Once the form page is visible, come back here and press Enter.\n');

await page.goto('https://accounts.google.com');

// Wait for user to finish logging in manually
process.stdout.write('Press Enter after you are logged in and the form loads... ');
await new Promise((resolve) => process.stdin.once('data', resolve));

// Navigate to form to confirm login works
await page.goto(FORM_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Save session
await context.storageState({ path: SESSION_FILE });
console.log(`\n✅ Session saved to: ${SESSION_FILE}`);
console.log('   You can now run: node fill-journal.mjs\n');

await browser.close();
process.exit(0);
