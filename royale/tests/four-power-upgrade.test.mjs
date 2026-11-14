// The experimental code now lives outside every production import path.
// Run: node --import ./test-only/four-powers/register.mjs --test test-only/four-powers/tests.test.mjs
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('four-power implementation is isolated from production',()=>{assert.ok(fs.existsSync('test-only/four-powers/powers.mjs'));assert.ok(!fs.readFileSync('royale-v3-staging/gameplay/powers.mjs','utf8').includes('animalAllies'));});
