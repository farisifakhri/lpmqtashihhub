import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationSchema } from '../src/validators/registration.validator.js';

test('registration title uses the same trimmed three-character rule as the form', () => {
  const mushaf_details = { penanggung_jawab_produk: 'Petugas Produk' };
  assert.equal(createRegistrationSchema.body.safeParse({ title: ' A ', mushaf_details }).success, false);
  const result = createRegistrationSchema.body.parse({ title: ' Mushaf ', mushaf_details });
  assert.equal(result.title, 'Mushaf');
});

test('a draft requires the product owner name even for direct API calls', () => {
  const result = createRegistrationSchema.body.safeParse({ title: 'Mushaf' });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ['mushaf_details', 'penanggung_jawab_produk']);
});
