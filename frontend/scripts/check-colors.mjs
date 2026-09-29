import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src');
const legacy = /(?<![\w-])(?:bg|text|border(?:-[trblxy])?|ring|from|via|to|shadow|divide|fill|stroke|placeholder|decoration|outline|accent|caret)-(?:primary|neutral|gold|status|slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose)(?:-[\w]+)?/g;
const violations = [];

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await check(filename);
    } else if (/\.(jsx?|css)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      const lines = (await readFile(filename, 'utf8')).split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const match of line.matchAll(legacy)) {
          violations.push(`${path.relative(root, filename)}:${index + 1}: ${match[0]}`);
        }
      });
    }
  }
}

await check(root);
if (violations.length) {
  process.stderr.write(`Use design-system color tokens:\n${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Frontend color tokens OK.\n');
}
