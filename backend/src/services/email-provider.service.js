import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

/**
 * P0-03: Email Provider Interface & Database Outbox Pattern
 * Provider default saat ini adalah MockEmailProvider (in-memory) untuk keperluan
 * pengujian unit/integrasi dan pengembangan lokal. Seluruh riwayat pengiriman
 * tercatat persisten pada tabel database `email_outbox`.
 * Untuk tahap produksi, adapter SMTP/API gateway eksternal dapat dihubungkan
 * ke interface provider ini tanpa mengubah alur outbox.
 */

export class MockEmailProvider {
  constructor() {
    this.sentMessages = [];
    this.failNext = false;
  }

  setFailNext(shouldFail = true) {
    this.failNext = shouldFail;
  }

  async sendEmail({ to, toName, subject, template, payload, attachments }) {
    if (this.failNext || process.env.SIMULATE_EMAIL_FAILURE === 'true') {
      this.failNext = false;
      throw new Error('Koneksi penyedia layanan email gagal terhubung (Simulated SMTP Timeout).');
    }

    const messageId = `msg_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const record = {
      messageId,
      to,
      toName,
      subject,
      template,
      payload,
      attachments,
      sentAt: new Date(),
    };
    this.sentMessages.push(record);
    return { success: true, messageId };
  }
}

// Global provider instance
export const emailProvider = new MockEmailProvider();

/**
 * Memproses pengiriman email melalui Outbox dengan Idempotency Key
 */
export async function sendOutboxEmail(tx, {
  registrationId,
  documentId,
  idempotencyKey,
  recipientEmail,
  recipientName,
  subject,
  template,
  payload = {},
  attachments = [],
}) {
  if (!recipientEmail || !recipientEmail.includes('@')) {
    fail(400, 'Alamat email penerima pada profil penerbit tidak valid.');
  }

  // 1. Cek apakah outbox record dengan idempotency key ini sudah ada
  let outbox = await tx.emailOutbox.findUnique({
    where: { idempotency_key: idempotencyKey },
  });

  if (outbox && outbox.status === 'SENT') {
    return { outbox, alreadySent: true };
  }

  if (!outbox) {
    outbox = await tx.emailOutbox.create({
      data: {
        registration_id: registrationId,
        document_id: documentId,
        idempotency_key: idempotencyKey,
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        subject,
        template,
        payload,
        attachments_json: attachments,
        status: 'QUEUED',
      },
    });
  }

  // 2. Eksekusi pengiriman ke Provider
  try {
    const result = await emailProvider.sendEmail({
      to: recipientEmail,
      toName: recipientName,
      subject,
      template,
      payload,
      attachments,
    });

    const updated = await tx.emailOutbox.update({
      where: { id: outbox.id },
      data: {
        status: 'SENT',
        sent_at: new Date(),
        provider_message_id: result.messageId,
        failure_reason: null,
        last_attempt_at: new Date(),
      },
    });

    return { outbox: updated, alreadySent: false };
  } catch (error) {
    const failed = await tx.emailOutbox.update({
      where: { id: outbox.id },
      data: {
        status: 'FAILED',
        failure_reason: error.message,
        retry_count: { increment: 1 },
        last_attempt_at: new Date(),
      },
    });

    // Lempar error agar pemanggil tahu pengiriman gagal
    const err = new Error(`Pengiriman email gagal: ${error.message}`);
    err.statusCode = 502;
    err.outbox = failed;
    throw err;
  }
}

