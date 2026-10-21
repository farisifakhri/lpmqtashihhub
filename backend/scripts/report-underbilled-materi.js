import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { calculateAddonMateriUnits } from '../src/services/registration.service.js';

/**
 * Skrip Laporan Hanya-Baca: Deteksi Potensi Kurang Tagih Add-on Materi Tambahan
 *
 * Sesuai ketentuan B-01 (Sesi 0, butir 5):
 * - Sifat: Murni HANYA-BACA (Read-Only). Tidak memodifikasi database.
 * - Membandingkan tagihan add-on ADD-MATERI aktual dengan perhitungan unit resmi.
 * - Format output: Ringkasan statistik & tabel rincian permohonan kurang tagih.
 *
 * Cara menjalankan:
 *   node backend/scripts/report-underbilled-materi.js
 *   node backend/scripts/report-underbilled-materi.js --json
 */

const prisma = new PrismaClient();

async function main() {
  const isJson = process.argv.includes('--json');

  try {
    const registrations = await prisma.registration.findMany({
      include: {
        service_type: {
          select: { id: true, name: true, base_fee: true },
        },
        addons: {
          include: {
            addon: { select: { id: true, code: true, name: true, fee: true } },
          },
        },
        publisher: {
          select: { id: true, legal_name: true, name: true },
        },
        payment_records: {
          select: { id: true, billing_no: true, amount: true, status: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const underbilledList = [];
    let totalAnalyzed = 0;
    let withMateriCount = 0;
    let totalUnderbilledAmount = 0;

    for (const reg of registrations) {
      totalAnalyzed++;

      const meta = reg.foreign_metadata || {};
      const mushafDetails = reg.mushaf_details || {};
      const jenisNaskahList = [
        ...(Array.isArray(meta.jenis_naskah) ? meta.jenis_naskah : []),
        ...(Array.isArray(mushafDetails.jenis_naskah) ? mushafDetails.jenis_naskah : []),
        ...(Array.isArray(reg.jenis_naskah) ? reg.jenis_naskah : []),
      ];

      const expectedUnits = calculateAddonMateriUnits(jenisNaskahList);
      if (expectedUnits > 0) {
        withMateriCount++;
      }

      const expectedAddonFee = expectedUnits * 500000;

      const addMateriRecord = reg.addons.find((a) => a.addon?.code === 'ADD-MATERI');
      const recordedQuantity = addMateriRecord ? Number(addMateriRecord.quantity || 1) : 0;
      const actualAddonFee = addMateriRecord ? Number(addMateriRecord.fee_snapshot || 0) : 0;

      // Terindikasi kurang tagih jika unit yang semestinya lebih besar dari yang ditagihkan
      if (expectedAddonFee > actualAddonFee) {
        const diff = expectedAddonFee - actualAddonFee;
        totalUnderbilledAmount += diff;

        underbilledList.push({
          id: reg.id,
          registration_no: reg.registration_no,
          title: reg.title,
          publisher_name: reg.publisher?.legal_name || reg.publisher?.name || '-',
          status: reg.status,
          service_name: reg.service_type?.name || '-',
          jenis_naskah: jenisNaskahList,
          expected_units: expectedUnits,
          expected_addon_fee: expectedAddonFee,
          actual_quantity: recordedQuantity,
          actual_addon_fee: actualAddonFee,
          underbilled_amount: diff,
          fee_sla_snapshot: reg.fee_sla_snapshot || null,
          created_at: reg.created_at,
        });
      }
    }

    if (isJson) {
      console.log(
        JSON.stringify(
          {
            summary: {
              total_analyzed: totalAnalyzed,
              with_materi_count: withMateriCount,
              underbilled_count: underbilledList.length,
              total_underbilled_amount: totalUnderbilledAmount,
            },
            underbilled_registrations: underbilledList,
          },
          null,
          2
        )
      );
      return;
    }

    console.log('========================================================================');
    console.log(' LAPORAN AUDIT HANYA-BACA: POTENSI KURANG TAGIH ADD-ON MATERI (B-01)   ');
    console.log('========================================================================\n');
    console.log(`Total Pengajuan Dianalisis      : ${totalAnalyzed}`);
    console.log(`Pengajuan dengan Materi Tambahan: ${withMateriCount}`);
    console.log(`Pengajuan Potensi Kurang Tagih  : ${underbilledList.length}`);
    console.log(`Total Nilai Potensi Kurang Tagih: Rp ${totalUnderbilledAmount.toLocaleString('id-ID')}\n`);

    if (underbilledList.length === 0) {
      console.log('✅ Tidak ditemukan pengajuan yang terindikasi kurang tagih.');
    } else {
      console.log('--- DAFTAR PENGAJUAN TERINDIKASI KURANG TAGIH ---\n');
      underbilledList.forEach((item, index) => {
        console.log(`[${index + 1}] No. Reg : ${item.registration_no}`);
        console.log(`    Judul   : ${item.title}`);
        console.log(`    Penerbit: ${item.publisher_name}`);
        console.log(`    Status  : ${item.status}`);
        console.log(`    Materi  : ${item.jenis_naskah.join(', ')}`);
        console.log(`    Unit    : ${item.actual_quantity} unit (seharusnya: ${item.expected_units} unit)`);
        console.log(`    Tagihan : Rp ${item.actual_addon_fee.toLocaleString('id-ID')} (seharusnya: Rp ${item.expected_addon_fee.toLocaleString('id-ID')})`);
        console.log(`    Selisih : +Rp ${item.underbilled_amount.toLocaleString('id-ID')}`);
        console.log('------------------------------------------------------------------------');
      });
    }

    console.log('\nCatatan: Skrip ini hanya menampilkan laporan dan TIDAK mengubah data.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Terjadi kesalahan saat menjalankan laporan:', err);
  process.exit(1);
});

