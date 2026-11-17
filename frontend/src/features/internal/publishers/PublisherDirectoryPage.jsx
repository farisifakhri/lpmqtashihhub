import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { publisherApi } from '@/api/publisher.api';
import { PublisherDirectory } from '@/features/publisher-directory/PublisherDirectory';

// Direktori Penerbit untuk Super Admin (Tata Kelola Sistem): termasuk NPWP/NIB pada detail.
export const PublisherDirectoryPage = () => (
  <main className="mx-auto max-w-7xl space-y-5 pb-12">
    <PageHeader
      breadcrumbs={[{ label: 'Tata Kelola Sistem' }, { label: 'Direktori Penerbit' }]}
      title="Direktori Penerbit Mushaf Al-Qur’an"
      subtitle="Penerbit yang pendaftarannya telah disetujui LPMQ, lengkap dengan alamat dan kontak penanggung jawab."
    />
    <PublisherDirectory fetchDirectory={publisherApi.directory} showSensitive />
  </main>
);

export default PublisherDirectoryPage;
