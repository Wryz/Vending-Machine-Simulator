// Regenerates src/i18n/locales/*/index.ts from the namespaces in locales/en and
// creates missing <lang>/<ns>.ts files as English copies to translate.
// Usage: node scripts/i18n/gen-locales.mjs [repoRoot] [--stub]
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd();
const dir = path.join(root, 'src/i18n/locales');
const langs = ['es', 'fr', 'de', 'ja', 'ko', 'zh-Hans', 'pt-BR'];
const nss = fs.readdirSync(path.join(dir, 'en')).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.replace(/\.ts$/, '')).sort();
const ident = (ns) => ns.replace(/[^A-Za-z0-9]/g, '_');
const HEADER = (lang) => `// Machine-drafted ${lang} translation. Needs a native-speaker review before launch.\n`;
// en index
fs.writeFileSync(path.join(dir, 'en/index.ts'),
`/**
 * English source catalog. Every other language must have exactly these keys
 * (checked by tsc via \`Shape<typeof en>\` and by src/i18n/i18n.test.ts).
 * One file per screen or area; keys group by namespace. Generated list; edit
 * with scripts or by hand, keeping it in sync with the other languages.
 */
${nss.map((n) => `import ${ident(n)} from './${n}';`).join('\n')}

const en = {
${nss.map((n) => `  ${ident(n)},`).join('\n')}
};

export default en;
`);
const stub = process.argv.includes('--stub');
for (const lang of langs) {
  fs.mkdirSync(path.join(dir, lang), { recursive: true });
  if (stub) {
    // Extraction phase: other languages show English until translated.
    fs.writeFileSync(path.join(dir, lang, 'index.ts'), `// Placeholder: English until translated.\nimport en from '../en';\n\nexport default en;\n`);
    continue;
  }
  for (const ns of nss) {
    const f = path.join(dir, lang, `${ns}.ts`);
    if (fs.existsSync(f)) continue;
    let src = fs.readFileSync(path.join(dir, 'en', `${ns}.ts`), 'utf8');
    src = src.replace(/\} as const;\s*$/, `} satisfies Shape<typeof en>;\n`);
    fs.writeFileSync(f, HEADER(lang) + `import type { Shape } from '../../core';\nimport type en from '../en/${ns}';\n\n` + src.replace(/^\/\*\*[\s\S]*?\*\/\n/, ''));
  }
  fs.writeFileSync(path.join(dir, lang, 'index.ts'),
`${HEADER(lang)}import type { Shape } from '../../core';
import type en from '../en';
${nss.map((n) => `import ${ident(n)} from './${n}';`).join('\n')}

const catalog: Shape<typeof en> = {
${nss.map((n) => `  ${ident(n)},`).join('\n')}
};

export default catalog;
`);
}
console.log('namespaces:', nss.join(', '));
