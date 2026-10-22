import test from 'node:test';
import assert from 'node:assert/strict';
import { printingReportSchema } from '../src/validators/workflow.validator.js';

test('U-16 / B-10: printingReportSchema validates required fields for printing report', () => {
  const validData = {
    batch_no: 1,
    print_date: '2026-11-05',
    oplah_printed: 5000,
    printer_name: 'PT Percetakan Menara Kudus',
    printer_location: 'Kudus, Jawa Tengah',
    exemplar_sent: true,
    exemplar_tracking_no: 'JNE-9912039120',
    notes: 'Cetakan kloter pertama ukuran A4 hard cover',
  };

  const parsed = printingReportSchema.body.safeParse(validData);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.batch_no, 1);
  assert.equal(parsed.data.oplah_printed, 5000);
  assert.equal(parsed.data.exemplar_sent, true);
});

test('U-16 / B-10: printingReportSchema rejects invalid date or zero oplah', () => {
  const invalidDate = {
    batch_no: 1,
    print_date: '05-11-2026', // Format tidak sesuai YYYY-MM-DD
    oplah_printed: 5000,
    printer_name: 'PT Percetakan',
    printer_location: 'Jakarta',
  };
  assert.equal(printingReportSchema.body.safeParse(invalidDate).success, false);

  const zeroOplah = {
    batch_no: 1,
    print_date: '2026-11-05',
    oplah_printed: 0, // Minimal 1
    printer_name: 'PT Percetakan',
    printer_location: 'Jakarta',
  };
  assert.equal(printingReportSchema.body.safeParse(zeroOplah).success, false);

  const emptyPrinter = {
    batch_no: 1,
    print_date: '2026-11-05',
    oplah_printed: 1000,
    printer_name: 'A', // Minimal 2 karakter
    printer_location: 'Jakarta',
  };
  assert.equal(printingReportSchema.body.safeParse(emptyPrinter).success, false);
});

