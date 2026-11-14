import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validNewPassword, PASSWORD_PATTERN } from '../src/domain/password';

test('form and service enforce the same new password policy', () => {
  const pattern = new RegExp(`^(?:${PASSWORD_PATTERN})$`, 'v');
  for (const value of ['Aura!123', 'Abcdefg!', 'Đabcdef!', 'A!' + 'a'.repeat(126)]) {
    assert.equal(validNewPassword(value), true); assert.equal(pattern.test(value), true);
  }
  for (const value of ['', 'Aura!12', 'aura!123', 'Aura1234', 'Aura123 ', 'Ábcdefgh', 'A!' + 'a'.repeat(127)]) {
    assert.equal(validNewPassword(value), false); assert.equal(pattern.test(value), false);
  }
});
