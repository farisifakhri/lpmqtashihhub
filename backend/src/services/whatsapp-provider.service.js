import { createHmac, randomUUID } from 'node:crypto';
import { ENV } from '../config/env.js';

/**
 * WhatsApp Notification Provider Interface
 * Mengikuti arsitektur provider modular yang siap dihubungkan dengan
 * WhatsApp Gateway resmi (Kemenag WA Gateway, Fonnte, Twilio, Wablas, dll).
 * Menggunakan MockWhatsAppProvider untuk local development & test suite.
 */
export class MockWhatsAppProvider {
  constructor() {
    this.sentMessages = [];
    this.failNext = false;
  }

  setFailNext(shouldFail = true) {
    this.failNext = shouldFail;
  }

  async sendWhatsApp({ to, message, template, payload }) {
    if (this.failNext || process.env.SIMULATE_WA_FAILURE === 'true') {
      this.failNext = false;
      throw new Error('Koneksi penyedia layanan WhatsApp gagal terhubung (Simulated WA Gateway Timeout).');
    }

    const messageId = `wa_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const record = {
      messageId,
      to,
      message,
      template,
      payload,
      sentAt: new Date(),
    };
    this.sentMessages.push(record);
    return { success: true, messageId };
  }
}

export const whatsAppProvider = new MockWhatsAppProvider();

export class QontakWhatsAppProvider {
  async sendOtp({ to, recipientName, code }) {
    if (!ENV.QONTAK_CLIENT_ID || !ENV.QONTAK_CLIENT_SECRET || !ENV.QONTAK_CHANNEL_INTEGRATION_ID || !ENV.QONTAK_TEMPLATE_UUID) {
      throw new Error('Konfigurasi pengiriman OTP WhatsApp Qontak belum lengkap.');
    }

    const phone = normalizeWhatsAppPhone(to);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ENV.QONTAK_TIMEOUT_MS);
    try {
      const endpoint = `${ENV.QONTAK_API_BASE_URL}/broadcasts/whatsapp/direct`;
      const requestPath = new URL(endpoint).pathname;
      const date = new Date().toUTCString();
      const requestLine = `POST ${requestPath} HTTP/1.1`;
      const signature = createHmac('sha256', ENV.QONTAK_CLIENT_SECRET)
        .update(`date: ${date}\n${requestLine}`)
        .digest('base64');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `hmac username="${ENV.QONTAK_CLIENT_ID}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`,
          Date: date,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          to_name: recipientName || 'Pengguna LPMQ',
          to_number: phone,
          message_template_id: ENV.QONTAK_TEMPLATE_UUID,
          channel_integration_id: ENV.QONTAK_CHANNEL_INTEGRATION_ID,
          language: { code: 'id' },
          parameters: {
            body: [{ key: '1', value_text: code, value: 'otp' }],
            buttons: [{ index: '0', type: 'url', value: code }],
          },
        }),
      });
      const responseText = await response.text();
      let result;
      try { result = responseText ? JSON.parse(responseText) : {}; } catch { result = {}; }
      if (!response.ok) {
        const error = new Error(`Qontak menolak pengiriman OTP (HTTP ${response.status}).`);
        error.statusCode = 502;
        error.providerStatus = response.status;
        throw error;
      }
      return { success: true, messageId: result?.data?.id || result?.id || `qontak_${randomUUID()}` };
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Waktu tunggu pengiriman OTP WhatsApp Qontak habis.');
        timeoutError.statusCode = 502;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

const qontakWhatsAppProvider = new QontakWhatsAppProvider();

function normalizeWhatsAppPhone(value) {
  let phone = String(value || '').trim().replace(/[\s()-]/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('08')) phone = `62${phone.slice(1)}`;
  if (!/^62\d{8,15}$/.test(phone)) {
    throw new Error('Nomor WhatsApp akun belum menggunakan format nomor Indonesia yang valid.');
  }
  return phone;
}

export async function sendWhatsAppOtp({ to, recipientName, code }) {
  if (ENV.WHATSAPP_DRIVER === 'qontak') {
    return qontakWhatsAppProvider.sendOtp({ to, recipientName, code });
  }
  const result = await whatsAppProvider.sendWhatsApp({
    to: String(to || '').trim(),
    message: `Kode pemulihan kata sandi LPMQ Anda: ${code}. Kode berlaku 10 menit.`,
    template: ENV.QONTAK_TEMPLATE_NAME || 'PASSWORD_RESET',
    payload: { recipientName, resetCode: code, expiresMinutes: 10 },
  });
  return result;
}

/**
 * Mengirim notifikasi WhatsApp terkait progres pengajuan tanda tashih
 */
export async function sendWhatsAppNotification({
  registrationId,
  recipientPhone,
  recipientName,
  message,
  payload = {},
}) {
  if (!recipientPhone || typeof recipientPhone !== 'string' || !recipientPhone.trim()) {
    return null;
  }

  // Normalisasi format nomor WhatsApp
  let formattedPhone = recipientPhone.trim();
  if (formattedPhone.startsWith('08')) {
    formattedPhone = '+62' + formattedPhone.slice(1);
  }

  try {
    const result = await whatsAppProvider.sendWhatsApp({
      to: formattedPhone,
      message,
      template: payload?.template || 'REGISTRATION_NOTIFICATION',
      payload: {
        registrationId,
        recipientName,
        ...payload,
      },
    });
    return { success: true, messageId: result.messageId, phone: formattedPhone };
  } catch (error) {
    console.error(`[WhatsAppProvider] Gagal mengirim pesan ke ${formattedPhone}:`, error.message);
    return { success: false, error: error.message, phone: formattedPhone };
  }
}
