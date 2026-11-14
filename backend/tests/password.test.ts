import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validPassword, validPasswordInput } from '../src/auth/password.ts';

test('new password requires 8–128 characters, uppercase and a non-whitespace symbol', () => {
  for (const value of ['Aura!123', 'Abcdefg!', 'Đabcdef!', 'A!' + 'a'.repeat(126)]) assert.equal(validPassword(value), true);
  for (const value of [null, undefined, 123, '', 'Aura!12', 'aura!123', 'Aura1234', 'Aura123 ', 'Ábcdefgh', 'A!' + 'a'.repeat(127)]) assert.equal(validPassword(value), false);
  assert.equal(validPasswordInput('legacy-password'), true);
  assert.equal(validPassword('legacy-password'), false);
});
