// Static guard: every key in prisma.<model>.<op>({ data | where | select | include | orderBy }) must exist in schema.prisma.
// Prisma only rejects unknown fields at runtime (as a 500), so typos and dropped columns otherwise slip through.
// shortcut: regex + brace matching, not a JS parser; it skips spreads and variables, so it only catches inline object literals.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';

const lower = (s) => s[0].toLowerCase() + s.slice(1);
const models = {};
const byType = {};
for (const m of Prisma.dmmf.datamodel.models) {
  const fields = new Map(m.fields.map((f) => [f.name, f]));
  // compound unique / id selectors, e.g. user_id_role_id
  for (const combo of [...(m.uniqueFields || []), m.primaryKey?.fields].filter((c) => c?.length > 1)) {
    fields.set(combo.join('_'), { kind: 'compound' });
  }
  for (const u of m.uniqueIndexes || []) if (u.name) fields.set(u.name, { kind: 'compound' });
  models[lower(m.name)] = fields;
  byType[m.name] = lower(m.name);
}
const SKIP = new Set(['AND', 'OR', 'NOT', '_count', '_sum', '_avg', '_min', '_max']);

function matchBrace(s, i) {
  let d = 0;
  let q = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if ('{[('.includes(c)) d++;
    else if ('}])'.includes(c)) { d--; if (d === 0) return j; }
  }
  return -1;
}

function topKeys(body) {
  const parts = [];
  let d = 0;
  let q = null;
  let start = 0;
  for (let j = 0; j <= body.length; j++) {
    const c = body[j];
    if (j === body.length || (!q && d === 0 && c === ',')) { parts.push(body.slice(start, j)); start = j + 1; continue; }
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if ('{[('.includes(c)) d++;
    else if ('}])'.includes(c)) d--;
  }
  const out = [];
  for (const p of parts) {
    const t = p.replace(/^(\s*\/\/[^\n]*\n)*/, '');
    if (!t.trim() || t.trim().startsWith('...')) continue;
    const m = t.match(/^\s*['"]?([A-Za-z_$][\w$]*)['"]?\s*(:|$)/);
    if (m) out.push({ key: m[1], value: m[2] === ':' ? t.slice(t.indexOf(':') + 1).trim() : null });
  }
  return out;
}

function checkObject(model, src, where, findings) {
  const fields = models[model];
  if (!fields) return;
  for (const { key, value } of topKeys(src.slice(1, -1))) {
    if (SKIP.has(key)) continue;
    const f = fields.get(key);
    if (!f) { findings.push(`${where}  ${model} -> unknown field "${key}"`); continue; }
    if (f.kind !== 'object' || !value?.startsWith('{')) continue;
    // nested relation: check its own select/include/where/orderBy against the related model
    const inner = value.slice(0, matchBrace(value, 0) + 1);
    for (const { key: k2, value: v2 } of topKeys(inner.slice(1, -1))) {
      if (['select', 'include', 'where', 'orderBy'].includes(k2) && v2?.startsWith('{')) {
        checkObject(byType[f.type], v2.slice(0, matchBrace(v2, 0) + 1), where, findings);
      }
    }
  }
}

const CALL = /\b(?:prisma|tx|db|client|trx)\.(\w+)\.(create|createMany|update|updateMany|upsert|findUnique|findUniqueOrThrow|findFirst|findFirstOrThrow|findMany|count|delete|deleteMany|aggregate|groupBy)\(\s*\{/g;

function scanFile(file, findings) {
  const s = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = CALL.exec(s))) {
    if (!models[m[1]]) continue;
    const open = m.index + m[0].length - 1;
    const end = matchBrace(s, open);
    if (end < 0) continue;
    const where = `${file}:${s.slice(0, m.index).split('\n').length}`;
    for (const { key, value } of topKeys(s.slice(open + 1, end))) {
      if (!['data', 'where', 'select', 'include', 'orderBy', 'create', 'update'].includes(key) || !value?.startsWith('{')) continue;
      checkObject(m[1], value.slice(0, matchBrace(value, 0) + 1), where, findings);
    }
  }
}

function walk(dir, findings) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, findings);
    else if (p.endsWith('.js')) scanFile(p, findings);
  }
}

test('every Prisma field referenced in src/ and scripts/ exists in schema.prisma', () => {
  const findings = [];
  walk('src', findings);
  walk('scripts', findings);
  assert.deepEqual(findings, []);
});

test('scanner catches an unknown field (self-check)', () => {
  const findings = [];
  const tmp = path.join('tests', 'unit', '.prisma-scan-fixture.tmp.js');
  fs.writeFileSync(tmp, "tx.documentationItem.update({ where: { id }, data: { status: 'PENDING', notes: 'x' } });\n");
  try { scanFile(tmp, findings); } finally { fs.unlinkSync(tmp); }
  assert.equal(findings.length, 1);
  assert.match(findings[0], /unknown field "notes"/);
});
