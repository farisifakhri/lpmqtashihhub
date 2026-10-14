/**
 * WCAG 2.1 AA Contrast Checker for LPMQ Design System
 * Verifies color contrast ratios for light mode tokens and UI pairings.
 * Acuan: Master Plan P0-3 & P0-4 (14 Okt 2026)
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensPath = path.resolve(__dirname, '../src/design-system/tokens.css');
const srcDir = path.resolve(__dirname, '../src');

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function parseHex(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function getLuminance(hex) {
  const rgb = parseHex(hex);
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
}

function calculateContrast(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function extractTokens() {
  const css = await readFile(tokensPath, 'utf8');
  const tokens = {};
  const tokenRegex = /--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g;
  for (const match of css.matchAll(tokenRegex)) {
    // Only capture root tokens (first occurrence before .dark)
    if (!tokens[match[1]]) {
      tokens[match[1]] = match[2];
    }
  }
  return tokens;
}

async function run() {
  const tokens = await extractTokens();
  const errors = [];
  const results = [];

  const textPairings = [
    { fgName: 'brand-fg', fg: tokens['brand-fg'], bgName: 'white', bg: '#ffffff', min: 4.5 },
    { fgName: 'brand-fg', fg: tokens['brand-fg'], bgName: 'canvas', bg: tokens['canvas'], min: 4.5 },
    { fgName: 'brand-fg', fg: tokens['brand-fg'], bgName: 'surface-subtle', bg: tokens['surface-subtle'], min: 4.5 },
    { fgName: 'brand-fg', fg: tokens['brand-fg'], bgName: 'surface-strong', bg: tokens['surface-strong'], min: 4.5 },
    { fgName: 'brand-fg', fg: tokens['brand-fg'], bgName: 'brand-50', bg: tokens['brand-50'], min: 4.5 },
    { fgName: 'brand-fg', fg: tokens['brand-fg'], bgName: 'brand-100', bg: tokens['brand-100'], min: 4.5 },
    { fgName: 'white', fg: '#ffffff', bgName: 'brand-fill', bg: tokens['brand-fill'], min: 4.5 },
    { fgName: 'white', fg: '#ffffff', bgName: 'brand-fill-hover', bg: tokens['brand-fill-hover'], min: 4.5 },
    { fgName: 'warning', fg: tokens['warning'], bgName: 'surface-strong', bg: tokens['surface-strong'], min: 4.5 },
    { fgName: 'warning', fg: tokens['warning'], bgName: 'white', bg: '#ffffff', min: 4.5 },
    { fgName: 'warning', fg: tokens['warning'], bgName: 'warning-soft', bg: '#fff7ed', min: 4.5 },
    { fgName: 'danger', fg: tokens['danger'], bgName: 'surface', bg: '#ffffff', min: 4.5 },
    { fgName: 'danger', fg: tokens['danger'], bgName: 'surface-strong', bg: tokens['surface-strong'], min: 4.5 },
    { fgName: 'success', fg: tokens['success'], bgName: 'surface', bg: '#ffffff', min: 4.5 },
    { fgName: 'success', fg: tokens['success'], bgName: 'surface-strong', bg: tokens['surface-strong'], min: 4.5 },
    { fgName: 'ink', fg: tokens['ink'], bgName: 'surface', bg: '#ffffff', min: 4.5 },
    { fgName: 'ink-muted', fg: tokens['ink-muted'], bgName: 'surface', bg: '#ffffff', min: 4.5 },
    { fgName: 'gold-700', fg: tokens['gold-700'], bgName: 'surface', bg: '#ffffff', min: 4.5 },
    { fgName: 'gold-700', fg: tokens['gold-700'], bgName: 'gold-100', bg: tokens['gold-100'], min: 4.5 },
  ];

  const uiPairings = [
    { fgName: 'brand-700 (accent)', fg: tokens['brand-700'], bgName: 'surface', bg: '#ffffff', min: 3.0 },
    { fgName: 'brand-700 (accent)', fg: tokens['brand-700'], bgName: 'canvas', bg: tokens['canvas'], min: 3.0 },
    { fgName: 'brand-700 (accent)', fg: tokens['brand-700'], bgName: 'surface-strong', bg: tokens['surface-strong'], min: 3.0 },
    { fgName: 'brand-700 (accent)', fg: tokens['brand-700'], bgName: 'brand-50', bg: tokens['brand-50'], min: 3.0 },
  ];

  for (const pair of textPairings) {
    if (!pair.fg || !pair.bg) {
      errors.push(`Missing token for pairing: ${pair.fgName} on ${pair.bgName}`);
      continue;
    }
    const cr = calculateContrast(pair.fg, pair.bg);
    const passed = cr >= pair.min;
    results.push({ ...pair, cr: cr.toFixed(2), passed, type: 'Text (WCAG AA >= 4.5:1)' });
    if (!passed) {
      errors.push(`FAIL: ${pair.fgName} (${pair.fg}) on ${pair.bgName} (${pair.bg}) has contrast ${cr.toFixed(2)}:1, expected >= ${pair.min}:1`);
    }
  }

  for (const pair of uiPairings) {
    if (!pair.fg || !pair.bg) {
      errors.push(`Missing token for pairing: ${pair.fgName} on ${pair.bgName}`);
      continue;
    }
    const cr = calculateContrast(pair.fg, pair.bg);
    const passed = cr >= pair.min;
    results.push({ ...pair, cr: cr.toFixed(2), passed, type: 'UI Component (WCAG AA >= 3.0:1)' });
    if (!passed) {
      errors.push(`FAIL: ${pair.fgName} (${pair.fg}) on ${pair.bgName} (${pair.bg}) has contrast ${cr.toFixed(2)}:1, expected >= ${pair.min}:1`);
    }
  }

  // Scan codebase to ensure no text-brand-700 is used on text elements
  async function checkCodebase(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await checkCodebase(fullPath);
      } else if (/\.jsx$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        const content = await readFile(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        lines.forEach((line, index) => {
          // Check for text elements using text-brand-700
          if (/<(p|span|a|h[1-6]|label|button)[^>]*\btext-brand-700\b[^>]*>/i.test(line)) {
            // Check if it's wrapping an icon only or has actual text
            const hasDirectText = /<(p|span|a|h[1-6]|label|button)[^>]*\btext-brand-700\b[^>]*>[^<]*[a-zA-Z0-9]/i.test(line);
            if (hasDirectText) {
              errors.push(`${path.relative(srcDir, fullPath)}:${index + 1}: text-brand-700 used on text element (use text-brand-fg for WCAG AA 4.5:1 contrast): ${line.trim()}`);
            }
          }
        });
      }
    }
  }

  await checkCodebase(srcDir);

  if (errors.length > 0) {
    process.stderr.write(`Contrast check failed with ${errors.length} error(s):\n`);
    for (const err of errors) {
      process.stderr.write(`  - ${err}\n`);
    }
    process.exitCode = 1;
  } else {
    process.stdout.write(`All ${results.length} WCAG 2.1 AA token pairings verified successfully:\n`);
    for (const res of results) {
      process.stdout.write(`  ✓ ${res.fgName} on ${res.bgName}: ${res.cr}:1 (min ${res.min}:1, ${res.type})\n`);
    }
    process.stdout.write('Frontend color contrast OK.\n');
  }
}

await run();

