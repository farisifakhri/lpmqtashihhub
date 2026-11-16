import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
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

    if (process.env.NODE_ENV !== 'test') {
      const recipient = toName ? `${toName} <${to}>` : to;
      console.log('\n┌────────────────────────────────────────────────────────────────────────┐');
      console.log('│ [INTERNAL EMAIL DRIVER] Simulated Email Outbox                          │');
      console.log('├────────────────────────────────────────────────────────────────────────┤');
      console.log(`│ Kepada   : ${recipient}`);
      console.log(`│ Subjek   : ${subject}`);
      console.log(`│ Template : ${template || '-'}`);
      if (payload?.action_url || payload?.reset_url || payload?.revision_url) {
        console.log(`│ Tautan   : ${payload.action_url || payload.reset_url || payload.revision_url}`);
      }
      if (payload?.token) {
        console.log(`│ Token    : ${payload.token}`);
      }
      console.log(`│ MessageId: ${messageId}`);
      console.log('└────────────────────────────────────────────────────────────────────────┘\n');
    }
    return { success: true, messageId };
  }
}

function payloadToText(payload = {}) {
  if (typeof payload === 'string') return payload;
  if (typeof payload.message === 'string') return payload.message;
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && typeof value !== 'object')
    .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`)
    .join('\n');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export class SmtpEmailProvider {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      requireTLS: ENV.SMTP_REQUIRE_TLS,
      auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
      connectionTimeout: ENV.SMTP_TIMEOUT_MS,
      greetingTimeout: ENV.SMTP_TIMEOUT_MS,
      socketTimeout: ENV.SMTP_TIMEOUT_MS,
    });
  }

  async sendEmail({ to, toName, subject, template, payload, attachments }) {
    const text = payloadToText(payload);
    let html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</div>`;
    let messageText = text;

    if (template === 'PASSWORD_RESET' && (payload?.resetCode || payload?.resetUrl)) {
      const name = toName ? ` ${escapeHtml(toName)}` : '';
      const expiresMinutes = Number(payload.expiresMinutes) || 30;
      if (payload.resetCode) {
        const instructions = 'Kembali ke halaman login, pilih “Lupa kata sandi?” lalu “Sudah memiliki token reset?” dan masukkan kode ini.';
        messageText = [
          `Halo${toName ? ` ${toName}` : ''},`,
          '',
          'Kami menerima permintaan untuk mengatur ulang kata sandi akun LPMQ Anda.',
          `Kode pemulihan: ${payload.resetCode}`,
          '',
          instructions,
          `Kode berlaku selama ${expiresMinutes} menit dan hanya dapat digunakan satu kali.`,
          'Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini.',
        ].join('\n');
        html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><p>Halo${name},</p><p>Kami menerima permintaan untuk mengatur ulang kata sandi akun LPMQ Anda.</p><p>Kode pemulihan:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#14532d">${escapeHtml(payload.resetCode)}</p><p>${escapeHtml(instructions)}</p><p>Kode berlaku selama ${expiresMinutes} menit dan hanya dapat digunakan satu kali.</p><p>Jika Anda tidak meminta pengaturan ulang ini, abaikan email ini.</p></div>`;
      } else {
        messageText = `${text}\n\nTautan berlaku selama ${expiresMinutes} menit dan hanya dapat digunakan satu kali.`;
        html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.6">${escapeHtml(messageText)}</div>`;
      }
    } else if (template === 'PUBLISHER_STATUS_INFO') {
      const name = toName ? ` ${escapeHtml(toName)}` : '';
      messageText = [
        `Halo${toName ? ` ${toName}` : ''},`,
        '',
        'Berikut adalah ringkasan status permohonan pendaftaran akun penerbit mushaf Al-Qur\'an Anda di Layanan Tashih LPMQ:',
        `Kode Pendaftaran: ${payload?.registration_code || '-'}`,
        `Status Saat Ini: ${payload?.status_label || '-'}`,
        '',
        'Gunakan kode pendaftaran di atas pada menu Cek Status Pendaftaran untuk melihat rincian progres lengkap.',
        'Lajnah Pentashihan Mushaf Al-Qur\'an (LPMQ) Kementerian Agama RI',
      ].join('\n');
      html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <p>Halo${name},</p>
        <p>Berikut adalah ringkasan status permohonan pendaftaran akun penerbit mushaf Al-Qur'an Anda di Layanan Tashih LPMQ:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:10px;margin:16px 0;">
          <p style="margin:4px 0;font-size:13px;color:#4b5563;">Kode Pendaftaran Resmi:</p>
          <p style="margin:4px 0;font-family:monospace;font-size:18px;font-weight:bold;color:#14532d;">${escapeHtml(payload?.registration_code || '-')}</p>
          <p style="margin:8px 0 4px;font-size:13px;color:#4b5563;">Status Terkini:</p>
          <p style="margin:4px 0;font-weight:bold;color:#1f2937;">${escapeHtml(payload?.status_label || '-')}</p>
        </div>
        <p>Simpan kode pendaftaran Anda dengan baik untuk mengakses portal layanan pentashihan.</p>
        <p>Terima kasih,<br><strong>LPMQ Kementerian Agama RI</strong></p>
      </div>`;
    }

    const result = await this.transporter.sendMail({
      from: { address: ENV.MAIL_FROM_ADDRESS, name: ENV.MAIL_FROM_NAME },
      to: toName ? { address: to, name: toName } : to,
      subject,
      text: messageText,
      html,
      attachments: Array.isArray(attachments) ? attachments : [],
      headers: template ? { 'X-LPMQ-Template': template } : undefined,
    });
    return { success: true, messageId: result.messageId };
  }
}

// Never send real emails from the test runtime, even if .env selects SMTP.
export const emailProvider = ENV.NODE_ENV === 'test' || ENV.MAIL_DRIVER !== 'smtp'
  ? new MockEmailProvider()
  : new SmtpEmailProvider();

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

