/**
 * Debug script — inspect Google Form DOM structure
 * Run: node debug-form.mjs
 * Browser stays open for 2 minutes for manual inspection
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const SESSION_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'session.json');
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSddkMKvGNQY-uPV3UTItTGkWFmfzq7RGouW8FAJFYgKYU2OTw/viewform';

if (!existsSync(SESSION_FILE)) {
  console.error('❌ No session. Run: node login.mjs');
  process.exit(1);
}

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({ storageState: SESSION_FILE });
const page = await context.newPage();

await page.goto(FORM_URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('\n=== INTERACTIVE ELEMENTS ON PAGE ===\n');

const info = await page.evaluate(() => {
  const results = [];

  // All inputs
  document.querySelectorAll('input').forEach((el) => {
    results.push({
      tag: 'input',
      type: el.type,
      role: el.getAttribute('role'),
      ariaLabel: el.getAttribute('aria-label'),
      class: el.className.slice(0, 60),
      placeholder: el.placeholder,
      name: el.name,
    });
  });

  // All divs with role
  document.querySelectorAll('div[role]').forEach((el) => {
    const role = el.getAttribute('role');
    if (['checkbox', 'listbox', 'button', 'option', 'group', 'combobox'].includes(role)) {
      results.push({
        tag: 'div',
        role,
        ariaLabel: el.getAttribute('aria-label'),
        ariaChecked: el.getAttribute('aria-checked'),
        text: el.innerText?.slice(0, 80),
        class: el.className.slice(0, 60),
        jsname: el.getAttribute('jsname'),
      });
    }
  });

  // All selects
  document.querySelectorAll('select').forEach((el) => {
    results.push({
      tag: 'select',
      ariaLabel: el.getAttribute('aria-label'),
      options: Array.from(el.options).map((o) => o.text),
    });
  });

  return results;
});

info.forEach((el) => console.log(JSON.stringify(el)));

console.log('\n=== QUESTION TITLES ===\n');
const titles = await page.evaluate(() => {
  const spans = document.querySelectorAll('span[role="heading"], .freebirdFormviewerComponentsQuestionBaseTitle, .M7eMe');
  return Array.from(spans).map((s) => s.innerText?.trim());
});
titles.filter(Boolean).forEach((t) => console.log(' •', t));

console.log('\n\nBrowser stays open 90s for manual inspection (DevTools: Cmd+Option+I)...\n');
await page.waitForTimeout(90000);
await browser.close();
