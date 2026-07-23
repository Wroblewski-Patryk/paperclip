#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateGreenfieldFixture, validatePromotionPacket } from './lib/v0-lifecycle-readiness.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const fixtureDir = path.join(repoRoot, 'doc', 'evals', 'fixtures');
const readJson = async (name) => JSON.parse(await readFile(path.join(fixtureDir, name), 'utf8'));

const greenfield = validateGreenfieldFixture(await readJson('v0-greenfield-intake.json'));
const promotion = validatePromotionPacket(await readJson('v0-innovation-promotion-packet.json'));
const result = {
  status: greenfield.status === 'PASS' && promotion.status === 'PASS' ? 'PASS' : 'FAIL',
  greenfield,
  promotion,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== 'PASS') process.exitCode = 1;
