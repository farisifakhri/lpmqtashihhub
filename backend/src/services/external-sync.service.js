import { prisma } from '../config/database.js';

/**
 * Layanan Sinkronisasi Pendaftaran Otomatis dengan Website Existing (tashih.kemenag.go.id)
 * Mengirimkan data permohonan pendaftaran naskah mushaf ke sistem pendaftaran pusat Kemenag.
 * Status sinkronisasi:
 * - PENDING: Belum dikirim atau URL integrasi belum dikonfigurasi.
 * - SYNCED: Berhasil diterima dan dikonfirmasi oleh sistem eksternal (2xx HTTP).
 * - FAILED: Gagal koneksi, timeout, atau server eksternal merespons non-2xx.
 */
export const syncRegistrationToExistingWebsite = async (registrationId) => {
  try {
    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        publisher: true,
        service_type: { include: { category: true } },
      },
    });

    if (!reg) return null;

    const externalApiUrl = process.env.EXISTING_WEBSITE_API_URL?.trim();

    // Jika URL integrasi tidak dikonfigurasi, jangan tandai berhasil atau isi sync_id palsu
    if (!externalApiUrl) {
      const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          external_sync_status: 'PENDING',
          external_sync_error: 'URL integrasi eksternal (EXISTING_WEBSITE_API_URL) belum dikonfigurasi. Status sinkronisasi PENDING.',
        },
      });

      return {
        synced: false,
        status: 'PENDING',
        message: 'URL integrasi eksternal belum dikonfigurasi. Menunggu konfigurasi sistem.',
      };
    }

    const apiKey = process.env.EXISTING_WEBSITE_API_KEY?.trim();
    if (!apiKey) {
      const errMsg = 'Kunci API integrasi eksternal (EXISTING_WEBSITE_API_KEY) belum dikonfigurasi.';
      await prisma.registration.update({
        where: { id: registrationId },
        data: {
          external_sync_status: 'FAILED_CONFIGURATION',
          external_sync_error: errMsg,
          external_sync_attempts: { increment: 1 },
        },
      });

      return {
        synced: false,
        status: 'FAILED_CONFIGURATION',
        error: errMsg,
      };
    }

    const payload = {
      source_system: 'LPMQ_TASHIH_HUB',
      registration_no: reg.registration_no,
      registration_category: reg.registration_category || reg.registration_type || 'NEW',
      title: reg.title,
      publisher: {
        legal_name: reg.publisher?.legal_name || 'Penerbit Terdaftar',
        entity_type: reg.publisher?.entity_type || 'PT',
        phone: reg.publisher?.phone || '',
      },
      service_type: {
        name: reg.service_type?.name,
        category: reg.service_type?.category?.name,
      },
      foreign_metadata: reg.foreign_metadata || null,
      status: reg.status,
      physical_dispatch_status: reg.physical_dispatch_status || 'PENDING',
      submitted_at: reg.created_at,
    };

    // Upaya pengiriman HTTP ke server eksternal
    try {
      const response = await fetch(externalApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        const errMsg = `Server eksternal mengembalikan HTTP ${response.status}: ${errBody.slice(0, 150)}`;

        await prisma.registration.update({
          where: { id: registrationId },
          data: {
            external_sync_status: 'FAILED',
            external_sync_error: errMsg,
            external_sync_attempts: { increment: 1 },
          },
        });

        return {
          synced: false,
          status: 'FAILED',
          error: errMsg,
        };
      }

      const resJson = await response.json().catch(() => ({}));
      const syncId = resJson.sync_id || resJson.id || `SYNC-TKID-${Date.now().toString(36).toUpperCase()}`;

      const updated = await prisma.registration.update({
        where: { id: registrationId },
        data: {
          external_sync_status: 'SYNCED',
          external_sync_id: syncId,
          external_synced_at: new Date(),
          external_sync_error: null,
          external_sync_attempts: { increment: 1 },
        },
      });

      return {
        synced: true,
        status: 'SYNCED',
        sync_id: syncId,
        synced_at: updated.external_synced_at,
      };
    } catch (networkErr) {
      const errMsg = `Gagal terhubung ke server eksternal: ${networkErr.message}`;
      await prisma.registration.update({
        where: { id: registrationId },
        data: {
          external_sync_status: 'FAILED',
          external_sync_error: errMsg,
          external_sync_attempts: { increment: 1 },
        },
      });

      return {
        synced: false,
        status: 'FAILED',
        error: errMsg,
      };
    }
  } catch (error) {
    console.error('[ExternalSync] Gagal memproses sinkronisasi data pendaftaran:', error);
    return { synced: false, status: 'FAILED', error: error.message };
  }
};

/**
 * Mengulang sinkronisasi eksternal untuk pengajuan tertentu
 */
export const retryExternalSync = async (registrationId) => {
  return syncRegistrationToExistingWebsite(registrationId);
};

/**
 * Webhook untuk menerima data pendaftaran dari website existing tashih.kemenag.go.id
 */
export const receiveFromExistingWebsite = async (incomingData) => {
  if (!incomingData || !incomingData.registration_no) {
    throw new Error('Data registrasi eksternal tidak valid.');
  }

  const existing = await prisma.registration.findUnique({
    where: { registration_no: incomingData.registration_no },
  });

  if (existing) {
    return prisma.registration.update({
      where: { id: existing.id },
      data: {
        external_sync_status: 'SYNCED',
        external_sync_id: incomingData.sync_id || existing.external_sync_id || `SYNC-IN-${Date.now().toString(36).toUpperCase()}`,
        external_synced_at: new Date(),
        external_sync_error: null,
      },
    });
  }

  return null;
};
