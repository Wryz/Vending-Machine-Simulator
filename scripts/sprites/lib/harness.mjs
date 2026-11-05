// Shared harness: bundle a TS browser entry with esbuild (resolving the `@/`
// alias through tsconfig paths) and run it in headless Chromium (Playwright).
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Playwright is preinstalled globally in CI/dev images; resolve it via NODE_PATH too. */
export function loadPlaywright() {
  const req = createRequire(import.meta.url);
  try {
    return req('playwright');
  } catch {
    const globalDir = process.env.NODE_PATH?.split(path.delimiter)[0];
    if (!globalDir)
      throw new Error('playwright not found: npm i -g playwright (or add it locally)');
    return req(path.join(globalDir, 'playwright'));
  }
}

export async function bundle(entry, globalName = 'Coinline') {
  const res = await esbuild.build({
    entryPoints: [path.resolve(ROOT, entry)],
    bundle: true,
    format: 'iife',
    globalName,
    platform: 'browser',
    target: 'es2022',
    write: false,
    tsconfig: path.join(ROOT, 'tsconfig.json'),
    logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  return res.outputFiles[0].text;
}

/** Launch Chromium with a blank page that has `code` loaded. */
export async function launchWithBundle(code, viewport = { width: 800, height: 800 }) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error(`[page ${m.type()}]`, m.text());
  });
  await page.setContent(
    '<!doctype html><html><body style="margin:0;background:transparent"></body></html>',
  );
  await page.addScriptTag({ content: code });
  return { browser, page };
}

export const b64ToBuf = (s) => Buffer.from(s, 'base64');
