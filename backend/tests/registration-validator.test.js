import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationSchema } from '../src/validators/registration.validator.js';
import { sendWhatsAppNotification, whatsAppProvider } from '../src/services/whatsapp-provider.service.js';
import { renderRegistrationReceiptPdf } from '../src/services/registration-receipt-pdf.service.js';

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

test('validates penanggung_jawab_email format if provided', () => {
  const invalidPayload = {
    title: 'Mushaf Al-Bayan',
    mushaf_details: {
      penanggung_jawab_produk: 'Ahmad Dahlan',
      penanggung_jawab_email: 'bukan-email-valid',
      penanggung_jawab_wa: '+628123456789',
    },
  };
  const invalidResult = createRegistrationSchema.body.safeParse(invalidPayload);
  assert.equal(invalidResult.success, false);
  assert.deepEqual(invalidResult.error.issues[0].path, ['mushaf_details', 'penanggung_jawab_email']);

  const validPayload = {
    title: 'Mushaf Al-Bayan',
    mushaf_details: {
      penanggung_jawab_produk: 'Ahmad Dahlan',
      penanggung_jawab_email: 'pj.mushaf@penerbit.com',
      penanggung_jawab_wa: '+628123456789',
    },
  };
  const validResult = createRegistrationSchema.body.safeParse(validPayload);
  assert.equal(validResult.success, true);
});

test('sendWhatsAppNotification dispatches message to MockWhatsAppProvider', async () => {
  const beforeCount = whatsAppProvider.sentMessages.length;
  const res = await sendWhatsAppNotification({
    registrationId: 'reg-test-123',
    recipientPhone: '08123456789',
    recipientName: 'Ahmad Dahlan',
    message: 'Pengajuan Mushaf Berhasil Disubmit',
  });

  assert.equal(res.success, true);
  assert.equal(res.phone, '+628123456789');
  assert.equal(whatsAppProvider.sentMessages.length, beforeCount + 1);
  const lastMsg = whatsAppProvider.sentMessages[whatsAppProvider.sentMessages.length - 1];
  assert.equal(lastMsg.to, '+628123456789');
  assert.equal(lastMsg.message, 'Pengajuan Mushaf Berhasil Disubmit');
});

test('renderRegistrationReceiptPdf renders valid PDF buffer with Kop and QR', async () => {
  const mockReg = {
    id: 'reg-pdf-1',
    registration_no: 'REG-202609-0001',
    title: 'Mushaf Al-Quran (Mushaf Al-Kabir)',
    registration_category: 'NEW',
    created_at: new Date(),
    publisher: {
      legal_name: 'PT Mushaf Nusantara Mandiri',
      name: 'Fakhri',
      email: 'mu.fakhrialfarisi@gmail.com',
      phone: '081317209305',
    },
    foreign_metadata: {
      nama_mushaf: 'Mushaf Al-Kabir',
      jenis_mushaf: 'Mushaf Standar Usmani',
      nama_percetakan: 'PT Indonesia Maju Sejahtera',
      penanggung_jawab_produk: 'Muhammad Fakhri Alfarisi',
      penanggung_jawab_wa: '081317209305',
      penanggung_jawab_email: 'mu.fakhrialfarisi@gmail.com',
    },
  };

  const buffer = await renderRegistrationReceiptPdf(mockReg);
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 4).toString('utf-8'), '%PDF');
});
