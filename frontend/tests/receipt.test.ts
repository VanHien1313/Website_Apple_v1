import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoptReceiptFromHash, currentReceipt, parseRecoveryInput, recoveryLink } from '../src/services/api/receiptRecovery';
import { newReceiptToken, readReceipt, saveReceipt } from '../src/services/api/orderService';

const memory = () => { const values = new Map<string, string>(); return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } }; };
const ID = '0b6f3f7e-4f0e-4b43-9c52-0d6b8a6d1c11';

test('recovery input accepts a raw token or a pasted link, and rejects anything else', () => {
  const token = newReceiptToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(parseRecoveryInput(`  ${token.toUpperCase()}  `), token);
  assert.equal(parseRecoveryInput(recoveryLink('https://aura.example', ID, token)), token);
  assert.equal(parseRecoveryInput(`#receipt=${token}`), token);
  for (const bad of ['', 'abc', token.slice(1), `${token}0`, `receipt=${token}0`, `x#receipt=${'g'.repeat(64)}`, `?token=${token}`]) assert.equal(parseRecoveryInput(bad), undefined, bad);
});

test('recovery link keeps the secret in the fragment only and encodes the order id', () => {
  const token = 'a'.repeat(64);
  const link = recoveryLink('https://aura.example', 'a/b c', token);
  const url = new URL(link);
  assert.equal(url.pathname, '/order-confirmation/a%2Fb%20c');
  assert.equal(url.search, ''); assert.equal(url.hash, `#receipt=${token}`);
  assert.ok(!link.split('#')[0].includes(token), 'token must never be in the path or query');
});

test('adopting a receipt from the URL hash stores it per order, case-insensitively, and ignores invalid hashes', () => {
  const storage = memory(); const token = newReceiptToken();
  assert.equal(adoptReceiptFromHash(ID, '', storage), false);
  assert.equal(adoptReceiptFromHash(ID, '#receipt=nope', storage), false);
  assert.equal(storage.values.size, 0);
  assert.equal(adoptReceiptFromHash(ID.toUpperCase(), `#receipt=${token}`, storage), true);
  assert.equal(readReceipt(ID, storage), token); assert.equal(currentReceipt(ID, storage), token);
  assert.equal(readReceipt('another-order', storage), undefined);
});

test('storage failures never throw out of recovery helpers', () => {
  const broken = { setItem() { throw new Error('denied'); }, getItem() { throw new Error('denied'); } };
  assert.equal(adoptReceiptFromHash(ID, `#receipt=${'b'.repeat(64)}`, broken), false);
  assert.equal(currentReceipt(ID, broken), undefined);
  assert.throws(() => saveReceipt(ID, 'x', broken), /denied/);
});
