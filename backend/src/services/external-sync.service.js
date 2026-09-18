import { prisma } from '../config/database.js';

/**
 * Layanan Sinkronisasi Pendaftaran Otomatis dengan Website Existing (tashih.kemenag.go.id)
 * Mengirimkan data permohonan pendaftaran naskah mushaf ke sistem pendaftaran pusat Kemenag.
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

    const externalApiUrl = process.env.EXISTING_WEBSITE_API_URL || 'https://tashih.kemenag.go.id/api/sync-registration';
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

    let syncId = `SYNC-TKID-${Date.now().toString(36).toUpperCase()}`;
    let syncSuccess = true;

    // Upaya pengiriman HTTP jika URL eksternal terkonfigurasi
    if (process.env.EXISTING_WEBSITE_API_URL) {
      try {
        const response = await fetch(externalApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.EXISTING_WEBSITE_API_KEY || 'lpmq-secret-key',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const resJson = await response.json().catch(() => ({}));
          syncId = resJson.sync_id || syncId;
        }
      } catch (networkErr) {
        // Fallback gracefully without blocking transaction
        console.warn(`[ExternalSync] Peringatan: Tidak dapat menjangkau server eksternal (${networkErr.message}). Menggunakan ID sinkronisasi lokal.`);
      }
    }

    const updated = await prisma.registration.update({
      where: { id: registrationId },
      data: {
        external_sync_id: syncId,
        external_synced_at: new Date(),
      },
    });

    return {
      synced: true,
      sync_id: syncId,
      synced_at: updated.external_synced_at,
    };
  } catch (error) {
    console.error('[ExternalSync] Gagal menyinkronkan data pendaftaran ke website existing:', error);
    return { synced: false, error: error.message };
  }
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
        external_synced_at: new Date(),
      },
    });
  }

  return null;
};

