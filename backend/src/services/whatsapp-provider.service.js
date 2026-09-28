import { randomUUID } from 'node:crypto';

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
